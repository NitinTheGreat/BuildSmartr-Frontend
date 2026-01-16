/**
 * Web Worker for background email indexing with real-time polling
 * DEBUG VERSION - Extensive logging enabled
 */

// IndexedDB helpers
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

// Config
const POLL_INTERVAL = 1500;
const MAX_POLL_DURATION = 15 * 60 * 1000;

// Normalize project ID
function normalizeProjectId(projectName) {
    const normalized = projectName
        .toLowerCase()
        .replace(/[\s\-]+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .trim();
    console.log('[WORKER] Normalized:', projectName, '→', normalized);
    return normalized;
}

// Poll status
async function pollStatus(projectId) {
    const url = `/api/projects/status?project_id=${encodeURIComponent(projectId)}`;
    console.log('[WORKER] Polling:', url);

    const response = await fetch(url);
    const text = await response.text();

    console.log('[WORKER] Poll response status:', response.status);
    console.log('[WORKER] Poll response body:', text);

    if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
    }

    return JSON.parse(text);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Main handler
self.onmessage = async (event) => {
    console.log('[WORKER] ========================================');
    console.log('[WORKER] MESSAGE RECEIVED:', JSON.stringify(event.data));
    console.log('[WORKER] ========================================');

    const { type, projectId, projectName, apiUrl } = event.data;

    if (type !== 'start') {
        console.log('[WORKER] Ignoring non-start message');
        return;
    }

    const normalizedProjectId = normalizeProjectId(projectName);

    console.log('[WORKER] Starting indexing...');
    console.log('[WORKER] Project ID:', projectId);
    console.log('[WORKER] Project Name:', projectName);
    console.log('[WORKER] Normalized ID:', normalizedProjectId);
    console.log('[WORKER] API URL:', apiUrl);

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
    let pollCount = 0;

    // Fire index request (don't await!)
    console.log('[WORKER] Firing index request to:', apiUrl);

    fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_name: projectName }),
    }).then(async (response) => {
        console.log('[WORKER] Index API returned, status:', response.status);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
            console.log('[WORKER] Index API error:', errorData);
            indexingError = errorData.error || 'Indexing failed to start';
        } else {
            const result = await response.json();
            console.log('[WORKER] Index API success:', JSON.stringify(result));
            indexingComplete = true;
        }
    }).catch((error) => {
        console.error('[WORKER] Index API fetch error:', error.message);
        indexingError = error.message;
    });

    // Wait a bit for backend to start
    console.log('[WORKER] Waiting 500ms before polling...');
    await sleep(500);

    // Start polling
    console.log('[WORKER] Starting poll loop...');
    const startTime = Date.now();

    while (!indexingComplete && !indexingError && (Date.now() - startTime) < MAX_POLL_DURATION) {
        pollCount++;
        console.log('[WORKER] ---- Poll #' + pollCount + ' ----');

        try {
            const statusData = await pollStatus(normalizedProjectId);

            console.log('[WORKER] Status:', statusData.status);
            console.log('[WORKER] Percent:', statusData.percent);
            console.log('[WORKER] Step:', statusData.step);

            if (statusData.status === 'completed' || statusData.percent >= 100) {
                console.log('[WORKER] COMPLETED!');

                const completedState = {
                    projectId,
                    projectName,
                    status: 'completed',
                    percent: 100,
                    currentStep: 'All done! Your project is ready.',
                    startedAt: initialState.startedAt,
                    completedAt: Date.now(),
                    stats: statusData.details,
                };

                await saveState(completedState);
                self.postMessage({
                    type: 'complete',
                    projectId,
                    result: { stats: completedState.stats }
                });

                return;
            }

            if (statusData.status === 'error') {
                console.log('[WORKER] ERROR from status:', statusData.error);
                throw new Error(statusData.error || 'Indexing failed');
            }

            if (statusData.status === 'not_found') {
                console.log('[WORKER] Status not_found, continuing...');
            } else if (statusData.status === 'indexing') {
                const percent = statusData.percent || 0;
                const step = statusData.step || 'Processing...';

                if (percent !== lastPercent) {
                    console.log('[WORKER] Progress update:', percent, '%');
                    lastPercent = percent;

                    await saveState({
                        projectId,
                        projectName,
                        status: 'indexing',
                        percent,
                        currentStep: step,
                        startedAt: initialState.startedAt,
                        stats: statusData.details,
                    });

                    self.postMessage({
                        type: 'progress',
                        projectId,
                        percent,
                        step,
                        stats: statusData.details
                    });
                }
            }

        } catch (pollError) {
            console.error('[WORKER] Poll error:', pollError.message);
        }

        console.log('[WORKER] Sleeping ' + POLL_INTERVAL + 'ms...');
        await sleep(POLL_INTERVAL);
    }

    // Check final state
    console.log('[WORKER] Exited poll loop');
    console.log('[WORKER] indexingComplete:', indexingComplete);
    console.log('[WORKER] indexingError:', indexingError);
    console.log('[WORKER] pollCount:', pollCount);

    if (indexingError) {
        console.log('[WORKER] Reporting error:', indexingError);
        await saveState({
            projectId,
            projectName,
            status: 'error',
            percent: 0,
            currentStep: 'Indexing failed',
            startedAt: initialState.startedAt,
            error: indexingError,
        });
        self.postMessage({ type: 'error', projectId, error: indexingError });
        return;
    }

    if (indexingComplete) {
        console.log('[WORKER] Index completed, marking as done');
        await saveState({
            projectId,
            projectName,
            status: 'completed',
            percent: 100,
            currentStep: 'All done! Your project is ready.',
            startedAt: initialState.startedAt,
            completedAt: Date.now(),
        });
        self.postMessage({ type: 'complete', projectId, result: {} });
        return;
    }

    console.log('[WORKER] Timeout!');
    self.postMessage({ type: 'error', projectId, error: 'Indexing timed out' });
};

console.log('[WORKER] Indexing worker loaded and ready!');
