const GITHUB_OWNER = 'ItsSkaiya'; 
const GITHUB_REPO = 'WaifuBoard'; 
const CURRENT_VERSION = 'v1.5.0'; 
const UPDATE_CHECK_INTERVAL = 5 * 60 * 1000; 

let currentVersionDisplay;
let latestVersionDisplay;
let updateToast;

document.addEventListener('DOMContentLoaded', () => {

    currentVersionDisplay = document.getElementById('currentVersionDisplay');
    latestVersionDisplay = document.getElementById('latestVersionDisplay');
    updateToast = document.getElementById('updateToast');

    if (currentVersionDisplay) {
        currentVersionDisplay.textContent = CURRENT_VERSION;
    }

    checkForUpdates(); 

    setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL);
});

function showToast(latestVersion) {

    if (latestVersionDisplay && updateToast) {
        latestVersionDisplay.textContent = latestVersion;
        updateToast.classList.add('update-available');
        updateToast.classList.remove('hidden');

    } else {
        console.error("Error: Cannot display toast because one or more DOM elements were not found.");
    }
}

function hideToast() {
    if (updateToast) {
        updateToast.classList.add('hidden');
        updateToast.classList.remove('update-available');
    }
}

function isVersionOutdated(versionA, versionB) {

    const vA = versionA.replace(/^v/, '').split('.').map(Number);
    const vB = versionB.replace(/^v/, '').split('.').map(Number);

    for (let i = 0; i < Math.max(vA.length, vB.length); i++) {
        const numA = vA[i] || 0;
        const numB = vB[i] || 0;

        if (numA < numB) return true; 
        if (numA > numB) return false; 
    }

    return false; 
}

async function checkForUpdates() {
    console.log(`Checking for updates for ${GITHUB_OWNER}/${GITHUB_REPO}...`);
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

    try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        const latestVersion = data.tag_name; 
        console.log(`Latest GitHub Release: ${latestVersion}`);

        if (isVersionOutdated(CURRENT_VERSION, latestVersion)) {
            console.warn('Update available!');
            showToast(latestVersion);
        } else {
            console.info('Package is up to date.');
            hideToast(); 
        }

    } catch (error) {
        console.error('Failed to fetch GitHub release:', error);
    }
}