// --- Configuration ---
const GITHUB_OWNER = 'ItsSkaiya'; // e.g., 'google'
const GITHUB_REPO = 'WaifuBoard'; // e.g., 'gemini-api-cookbook'
const CURRENT_VERSION = '1.0.0'; // Manually set this, or pull from a package.json/config file

// --- DOM Elements ---
const currentVersionDisplay = document.getElementById('currentVersionDisplay');
const latestVersionDisplay = document.getElementById('latestVersionDisplay');
const updateToast = document.getElementById('updateToast');

// Display the current version on load
document.addEventListener('DOMContentLoaded', () => {
    currentVersionDisplay.textContent = CURRENT_VERSION;
});


/**
 * Shows the update notification toast.
 * @param {string} latestVersion - The latest version string from GitHub.
 */
function showToast(latestVersion) {
    latestVersionDisplay.textContent = latestVersion;
    updateToast.classList.add('update-available');
    updateToast.classList.remove('hidden');
    // NOTE: The toast will NOT close until the user clicks 'X'
}

/**
 * Hides the update notification toast.
 */
function hideToast() {
    updateToast.classList.add('hidden');
    updateToast.classList.remove('update-available');
}

/**
 * Compares two semantic version strings (e.g., "1.2.3" vs "1.2.4").
 * Returns true if version A is older than version B.
 * @param {string} versionA - The current version.
 * @param {string} versionB - The latest version.
 * @returns {boolean} True if A is older than B.
 */
function isVersionOutdated(versionA, versionB) {
    // Clean up version strings (e.g., remove 'v' prefix) and split by '.'
    const vA = versionA.replace(/^v/, '').split('.').map(Number);
    const vB = versionB.replace(/^v/, '').split('.').map(Number);

    for (let i = 0; i < Math.max(vA.length, vB.length); i++) {
        const numA = vA[i] || 0;
        const numB = vB[i] || 0;

        if (numA < numB) return true; // A is older
        if (numA > numB) return false; // A is newer
    }

    return false; // Versions are the same or incomparable
}

/**
 * Main function to fetch the latest GitHub release and check for updates.
 */
async function checkForUpdates() {
    console.log(`Checking for updates for ${GITHUB_OWNER}/${GITHUB_REPO}...`);
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

    try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        // The tag_name often contains the version (e.g., "v1.0.1")
        const latestVersion = data.tag_name; 
        console.log(`Latest GitHub Release: ${latestVersion}`);

        if (isVersionOutdated(CURRENT_VERSION, latestVersion)) {
            // Package is out of date! Issue the red toast notification.
            console.warn('Update available!');
            showToast(latestVersion);
        } else {
            // Package is up to date or newer. Do not show the toast.
            console.info('Package is up to date.');
            hideToast(); // Ensure it's hidden in case a previous check showed it
        }

    } catch (error) {
        console.error('Failed to fetch GitHub release:', error);
        // You might want a different toast here for a failure notification
    }
}