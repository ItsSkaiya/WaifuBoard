export async function populateSources(sourceList) {
  console.log('Requesting sources from main process...');
  const sources = await window.api.getSources();
  sourceList.innerHTML = '';
  let initialSource = '';

  if (sources && sources.length > 0) {
    sources.forEach((source) => {
      const button = document.createElement('button');
      
      button.className = 'source-button hover:bg-gray-700 hover:text-white transition-all duration-200';
      
      button.dataset.source = source.name;
      button.title = source.name;

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
        mainDomain = source.name;
      }

      const favicon = document.createElement('img');
      favicon.className = 'source-icon rounded'; 
      favicon.src = `https://www.google.com/s2/favicons?domain=${mainDomain}&sz=32`;
      favicon.alt = source.name;

      const textWrapper = document.createElement('div');
      textWrapper.className = 'source-text-wrapper';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'source-name';
      nameSpan.textContent = source.name;

      const urlSpan = document.createElement('span');
      urlSpan.className = 'source-url';
      urlSpan.textContent = mainDomain;

      textWrapper.appendChild(nameSpan);
      textWrapper.appendChild(urlSpan);

      favicon.onerror = () => {
        favicon.remove();
        const fallbackIcon = document.createElement('div');
        fallbackIcon.className = 'source-icon fallback';
        fallbackIcon.textContent = source.name.substring(0, 1).toUpperCase();
        button.insertBefore(fallbackIcon, textWrapper);
      };

      button.appendChild(favicon);
      button.appendChild(textWrapper);
      
      sourceList.appendChild(button);
    });

    if (sourceList.children.length > 0) {
      const firstButton = sourceList.children[0];
      firstButton.classList.add('active');
      initialSource = firstButton.dataset.source;
    }
    
    setupCarousel(sourceList);

  } else {
    console.warn('No sources loaded.');
  }
  return initialSource;
}

function setupCarousel(element) {
  element.addEventListener('wheel', (evt) => {
    if (evt.deltaY !== 0) {
      if (element.scrollWidth > element.clientWidth) {
        evt.preventDefault();
        element.scrollLeft += evt.deltaY;
      }
    }
  });

  let isDown = false;
  let startX;
  let scrollLeft;

  element.addEventListener('mousedown', (e) => {
    isDown = true;
    element.style.cursor = 'grabbing';
    startX = e.pageX - element.offsetLeft;
    scrollLeft = element.scrollLeft;
  });

  element.addEventListener('mouseleave', () => {
    isDown = false;
    element.style.cursor = 'grab';
  });

  element.addEventListener('mouseup', () => {
    isDown = false;
    element.style.cursor = 'grab';
  });

  element.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault(); 
    const x = e.pageX - element.offsetLeft;
    const walk = (x - startX) * 2; 
    element.scrollLeft = scrollLeft - walk;
  });
  
  element.style.cursor = 'grab';
}