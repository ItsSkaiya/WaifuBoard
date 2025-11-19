export async function populateSources(sourceList) {
  console.log('Requesting sources from main process...');
  const sources = await window.api.getSources();
  sourceList.innerHTML = '';
  let initialSource = '';

  if (sources && sources.length > 0) {
    sources.forEach((source) => {
      const button = document.createElement('button');
      button.className =
        'source-button w-12 h-12 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-700 hover:text-white transition-all duration-200';
      button.dataset.source = source.name;
      button.title = source.name;

      const favicon = document.createElement('img');
      favicon.className = 'w-8 h-8 rounded';

      let mainDomain = source.url;
      try {
        const hostname = new URL(source.url).hostname;
        const parts = hostname.split('.');
        if (parts.length > 2 && ['api', 'www'].includes(parts[0])) {
          mainDomain = parts.slice(1).join('.');
        } else {
          mainDomain = hostname;
        }
      } catch (e) {
        console.warn(`Could not parse domain from ${source.url}:`, e);
        mainDomain = source.name;
      }

      favicon.src = `https://www.google.com/s2/favicons?domain=${mainDomain}&sz=32`;
      favicon.alt = source.name;
      favicon.onerror = () => {
        button.innerHTML = `<span class="font-bold text-sm">${source.name.substring(
          0,
          2
        )}</span>`;
        favicon.remove();
      };

      button.appendChild(favicon);
      sourceList.appendChild(button);
    });
    console.log('Sources populated:', sources);

    if (sourceList.children.length > 0) {
      const firstButton = sourceList.children[0];
      firstButton.classList.add('active');
      initialSource = firstButton.dataset.source;
    }
  } else {
    console.warn('No sources were loaded from the main process.');
  }
  return initialSource;
}