/**
 * Web Worker for background email indexing with real-time polling
 * Survives page navigation and persists results to IndexedDB
 * 
 * IMPORTANT: The /api/projects/index endpoint is synchronous and blocks until
 * indexing is complete. We need to start polling IMMEDIATELY in parallel.
 */

// IndexedDB helpers (duplicated for worker context)
const DB_NAME = 'donna_indexing';
const DB_VERSION = 1;
const STORE_NAME = 'indexing_states';

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'projectId' });
            }
        };
    });
}

async function saveState(state) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(state);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
        transaction.oncomplete = () => db.close();
    });
}

// Polling configuration
const POLL_INTERVAL = 1500; // 1.5 seconds
const MAX_POLL_DURATION = 15 * 60 * 1000; // 15 minutes max

// Normalize project name to ID (same logic as backend)
function normalizeProjectId(projectName) {
    return projectName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .trim();
}

// Poll the status endpoint
async function pollStatus(projectId) {
    const response = await fetch(`/api/projects/status?project_id=${encodeURIComponent(projectId)}`);

    if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
    }

    return response.json();
}

// Sleep helper
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Handle messages from main thread
self.onmessage = async (event) => {
    const { type, projectId, projectName, apiUrl } = event.data;

    if (type !== 'start') return;

    // Normalize project ID to match backend format
    const normalizedProjectId = normalizeProjectId(projectName);

    console.log('[Worker] Starting indexing for:', projectName);
    console.log('[Worker] Normalized project ID:', normalizedProjectId);

    // Initial state
    const initialState = {
        projectId,
        projectName,
        status: 'indexing',
        percent: 0,
        currentStep: 'Starting project indexing...',
        startedAt: Date.now(),
    };

    await saveState(initialState);
    self.postMessage({ type: 'progress', projectId, percent: 0, step: 'Starting project indexing...' });

    let indexingComplete = false;
    let indexingError = null;
    let lastPercent = 0;

    // Start the index request (DO NOT AWAIT - it's synchronous and blocks!)
    // Fire and forget - the polling will track the progress
    const indexPromise = fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_name: projectName }),
    }).then(async (response) => {
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(errorData.error || errorData.message || 'Indexing failed to start');
        }
        const result = await response.json();
        console.log('[Worker] Index API returned:', result.status);
        indexingComplete = true;
        return result;
    }).catch((error) => {
        console.error('[Worker] Index API error:', error.message);
        indexingError = error.message;
    });

    // Give the backend a moment to start processing
    await sleep(500);

    // Start polling IMMEDIATELY (in parallel with the index request)
    const startTime = Date.now();

    while (!indexingComplete && !indexingError && (Date.now() - startTime) < MAX_POLL_DURATION) {
        try {
            const statusData = await pollStatus(normalizedProjectId);

            console.log('[Worker] Poll response:', statusData.status, statusData.percent + '%');

            // Handle different status values
            if (statusData.status === 'completed') {
                // Indexing complete!
                const completedState = {
                    projectId,
                    projectName,
                    status: 'completed',
                    percent: 100,
                    currentStep: 'All done! Your project is ready.',
                    startedAt: initialState.startedAt,
                    completedAt: Date.now(),
                    stats: {
                        thread_count: statusData.details?.thread_count || 0,
                        message_count: statusData.details?.message_count || 0,
                        pdf_count: statusData.details?.pdf_count || 0,
                    },
                };

                await saveState(completedState);
                self.postMessage({
                    type: 'complete',
                    projectId,
                    result: { stats: completedState.stats }
                });

                console.log('[Worker] Indexing completed successfully');
                return;
            }

            if (statusData.status === 'error') {
                throw new Error(statusData.error || 'Indexing failed');
            }

            if (statusData.status === 'not_found') {
                // Backend might not have started yet, or project ID mismatch
                // Just continue polling
                console.log('[Worker] Status not found yet, continuing to poll...');
            } else {
                // Update progress (status === 'indexing')
                const percent = statusData.percent || 0;
                const step = statusData.step || 'Processing...';
                const stats = statusData.details || null;

                // Only update if progress has changed
                if (percent !== lastPercent || step !== initialState.currentStep) {
                    lastPercent = percent;

                    const progressState = {
                        projectId,
                        projectName,
                        status: 'indexing',
                        percent,
                        currentStep: step,
                        startedAt: initialState.startedAt,
                        stats,
                    };

                    await saveState(progressState);
                    self.postMessage({
                        type: 'progress',
                        projectId,
                        percent,
                        step,
                        stats
                    });
                }
            }

        } catch (pollError) {
            console.error('[Worker] Poll error:', pollError.message);
            // Continue polling on transient errors
        }

        // Wait before next poll
        await sleep(POLL_INTERVAL);
    }

    // If we exited the loop, check if there was an error from the index request
    if (indexingError) {
        const errorState = {
            projectId,
            projectName,
            status: 'error',
            percent: 0,
            currentStep: 'Indexing failed',
            startedAt: initialState.startedAt,
            error: indexingError,
        };

        await saveState(errorState);
        self.postMessage({ type: 'error', projectId, error: indexingError });
        return;
    }

    // If the index promise completed, wait for final result
    if (indexingComplete) {
        try {
            await indexPromise;

            // Do one final poll to get the completion status
            const finalStatus = await pollStatus(normalizedProjectId);

            if (finalStatus.status === 'completed') {
                const completedState = {
                    projectId,
                    projectName,
                    status: 'completed',
                    percent: 100,
                    currentStep: 'All done! Your project is ready.',
                    startedAt: initialState.startedAt,
                    completedAt: Date.now(),
                    stats: finalStatus.details,
                };

                await saveState(completedState);
                self.postMessage({
                    type: 'complete',
                    projectId,
                    result: { stats: completedState.stats }
                });
            } else {
                // Assume completed since index request succeeded
                const completedState = {
                    projectId,
                    projectName,
                    status: 'completed',
                    percent: 100,
                    currentStep: 'All done! Your project is ready.',
                    startedAt: initialState.startedAt,
                    completedAt: Date.now(),
                };

                await saveState(completedState);
                self.postMessage({ type: 'complete', projectId, result: {} });
            }
        } catch (err) {
            self.postMessage({ type: 'error', projectId, error: err.message });
        }
        return;
    }

    // Timeout reached
    const errorState = {
        projectId,
        projectName,
        status: 'error',
        percent: lastPercent,
        currentStep: 'Indexing timed out',
        startedAt: initialState.startedAt,
        error: 'Indexing timed out - exceeded maximum duration',
    };

    await saveState(errorState);
    self.postMessage({ type: 'error', projectId, error: 'Indexing timed out' });
};
