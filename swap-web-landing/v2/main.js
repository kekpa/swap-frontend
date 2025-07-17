document.addEventListener('DOMContentLoaded', () => {
  const languageSwitcher = {
    button: document.getElementById('lang-btn'),
    menu: document.getElementById('lang-menu'),
    links: document.querySelectorAll('.lang-link'),
    currentLangSpan: document.getElementById('current-lang-flag'),
    currentLangNameSpan: document.getElementById('current-lang-name'),
    
    init() {
      this.button.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMenu();
      });
      document.addEventListener('click', (e) => this.closeMenu(e));
      this.links.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          this.setLanguage(e.target.closest('.lang-link').dataset.lang);
        });
      });
      this.loadLanguage();
    },

    toggleMenu() {
      this.menu.classList.toggle('show');
    },

    closeMenu(event) {
      if (!this.button.contains(event.target)) {
        this.menu.classList.remove('show');
      }
    },

    async setLanguage(lang) {
      localStorage.setItem('language', lang);
      this.menu.classList.remove('show');
      await this.loadLanguage(lang);
    },

    async loadLanguage(lang = localStorage.getItem('language') || 'ht') {
      try {
        const response = await fetch(`locales/${lang}.json`);
        if (!response.ok) throw new Error(`Locale file for ${lang} not found`);
        
        const translations = await response.json();
        this.applyTranslations(translations);
        this.updateCurrentLangDisplay(lang);
        document.documentElement.lang = lang;
        document.title = translations['hero.title.template'] ? 
          translations['hero.title.template'].replace('{ROTATING_WORD}', translations['hero.rotating.words'][0]) : 'Swap';
        localStorage.setItem('language', lang);
      } catch (error) {
        console.error('Error loading language:', error);
      }
    },

    applyTranslations(translations) {
      // Handle regular translations
      document.querySelectorAll('[data-i18n-key]').forEach(element => {
        const key = element.dataset.i18nKey;
        if (translations[key]) {
          let content = translations[key];
          if (typeof content === 'string' && content.includes('{year}')) {
            content = content.replace('{year}', new Date().getFullYear());
          }
          element.innerHTML = content;
        }
      });

      // Handle template-based hero title
      const heroTitle = document.querySelector('[data-i18n-template]');
      if (heroTitle && translations['hero.title.template'] && translations['hero.rotating.words']) {
        rotatingWord.init(heroTitle, translations['hero.title.template'], translations['hero.rotating.words']);
      }
    },
    
    updateCurrentLangDisplay(lang) {
        const langFlags = {
            ht: '🇭🇹',
            fr: '🇫🇷',
            en: '🇬🇧'
        };
        this.currentLangSpan.textContent = langFlags[lang] || '🇭🇹';

        const activeLink = document.querySelector(`.lang-link[data-lang="${lang}"]`);
        if (activeLink) {
            const langName = activeLink.querySelector('span:last-child').textContent;
            this.currentLangNameSpan.textContent = langName;
        }
    }
  };

  const rotatingWord = {
    element: null,
    template: '',
    words: [],
    currentIndex: 0,
    intervalId: null,
    rotatingSpan: null,

    init(element, template, words) {
      if (!element || !template || !words || words.length === 0) return;
      
      this.element = element;
      this.template = template;
      this.words = words;
      this.currentIndex = 0;
      
      this.setupHTML();
      this.startRotation();
    },

    setupHTML() {
      // Create the HTML structure with rotating word span
      const rotatingWordHtml = `<span class="rotating-word"><span class="active">${this.words[0]}</span></span>`;
      this.element.innerHTML = this.template.replace('{ROTATING_WORD}', rotatingWordHtml);
      
      this.rotatingSpan = this.element.querySelector('.rotating-word');
      
      // Add all word spans
      this.words.forEach((word, index) => {
        if (index === 0) return; // First word is already there
        
        const span = document.createElement('span');
        span.textContent = word;
        this.rotatingSpan.appendChild(span);
      });
    },

    startRotation() {
      if (this.intervalId) clearInterval(this.intervalId);
      this.intervalId = setInterval(() => this.rotate(), 4000); // 4 seconds for professional timing
    },

    rotate() {
      if (!this.rotatingSpan) return;
      
      const spans = this.rotatingSpan.querySelectorAll('span');
      if (spans.length === 0) return;

      // Remove active from current word
      spans[this.currentIndex].classList.remove('active');
      
      // Move to next word
      this.currentIndex = (this.currentIndex + 1) % this.words.length;
      
      // Add active to next word
      spans[this.currentIndex].classList.add('active');
    }
  };

  const animations = {
    init() {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      }, { threshold: 0.1 });

      document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
    }
  };

  languageSwitcher.init();
  animations.init();
}); 