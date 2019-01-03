/* eslint-env browser */
import Domodule from 'domodule';
import { prefixedTransform, isTouch, on, off, hover, addClass, removeClass, find, fire } from 'domassist';
import tinybounce from 'tinybounce';

const TRANSFORM_PROPERTY = prefixedTransform();
const rAF = window.requestAnimationFrame || window.setTimeout;

const CLASSES = {
  DRAG: 'dragging'
};

const SELECTORS = {
  SLIDES: '[data-carousel-slides]',
  SLIDE: '[data-carousel-slide]',
  DOTS: '.carousel-control'
};

export default class Carousel extends Domodule {
  static get Events() {
    return {
      slideChange: 'carousel:slide:change'
    };
  }

  get defaults() {
    return {
      transformsEnabled: false
    };
  }

  postInit() {
    this.currentPage = 0;
    this.moved = false;
    this.isTouchEnabled = isTouch();

    this.boundStart = this.onTouchStart.bind(this);
    this.boundEnd = this.onTouchEnd.bind(this);
    this.boundMove = this.onTouchMove.bind(this);

    this.setReferences();
    this.parseOptions();

    on(window, 'resize', tinybounce(this.onResize.bind(this), 100));
    on(this.el, 'carousel:pause', () => {
      this.paused = true;
    });
    on(this.el, 'carousel:resume', () => {
      this.paused = false;
    });

    if (this.currentPage) {
      this.calcBounds();
      this.goToPage(this.currentPage);
    } else {
      this.updateAria();
      this.calcBounds();
    }
  }

  parseOptions() {
    if (this.isTouchEnabled &&
      this.options.match &&
      !window.matchMedia(this.options.match).matches) {
      this.isTouchEnabled = false;
    }

    if (this.options.transformsEnabled) {
      this.options.transformsEnabled = this.options.transformsEnabled === 'true';
    }

    if (this.options.transformOn) {
      this.options.transformsEnabled = window.matchMedia(this.options.transformOn).matches;
    }

    if (typeof this.options.responsive !== 'undefined') {
      try {
        this.options.responsive = JSON.parse(this.options.responsive.replace(/'/g, '"'));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to decode options.', this.options.responsive);
        this.options.responsive = null;
      }
    }

    this.slidesPerPages = 1;
    this.updateSettings();

    if (this.options.autoslide && !this.isTouchEnabled) {
      setTimeout(this.startAutoSlide.bind(this), 0);
    }
  }

  startAutoSlide() {
    this.interval = parseInt(this.options.autoslide, 10);

    if (typeof this.interval === 'number' && !isNaN(this.interval)) {
      this.play();
      hover(this.el, this.pause.bind(this), this.play.bind(this));
    }
  }

  updateSettings() {
    if (!this.options.responsive) {
      return;
    }

    let setting = false;
    const l = this.options.responsive.length;

    for (let i = 0; i < l && !setting; i++) {
      const option = this.options.responsive[i];

      if (window.matchMedia(option.bp).matches) {
        setting = option;
      }
    }

    if (!setting) {
      // eslint-disable-next-line no-console
      console.warn('No match for responsive settings.');
    }

    this.maxPages = Math.ceil(this.slides.length / setting.slides);
    this.slidesPerPages = setting.slides;

    if (this.currentPage > this.maxPages) {
      this.currentPage = this.maxPages - 1;
      this.updateAria();
    }
  }

  setReferences() {
    let slidesContainers = this.find(SELECTORS.SLIDES);
    if (!slidesContainers.length) {
      slidesContainers = [this.el];
    }

    this.slidesContainers = slidesContainers
      .map(container => find(SELECTORS.SLIDE, container));
    this.slides = this.find(SELECTORS.SLIDE);
    this.dots = this.find(SELECTORS.DOTS);
    this.maxPages = this.dots.length;
    this.paused = false;
    this.prevButtons = this.find('[data-action="goPrev"]');
    this.nextButtons = this.find('[data-action="goNext"]');

    this.slides.forEach((slide, i) => {
      if (slide.getAttribute('aria-hidden') === 'false') {
        this.currentPage = i;
      }
    });

    // There aren't buttons
    if (!this.maxPages) {
      this.maxPages = this.slidesContainers[0].length;
    }
  }

  play() {
    if (!this.intervalId) {
      this.intervalId = setInterval(() => {
        if (this.paused) {
          // No sliding if paused
          return;
        }

        let nextPage = this.currentPage + 1;

        if (nextPage >= this.maxPages) {
          nextPage = 0;
        }

        this.goToPage(nextPage);
      }, this.interval);
    }
  }

  pause() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getSlidesForI(i) {
    return [].concat.apply([], this.slidesContainers.map(container => {
      const slides = [];
      i = i * this.slidesPerPages;
      const l = this.slidesPerPages;

      for (let j = 0; j < l && container[i + j]; j++) {
        slides.push(container[i + j]);
      }

      return slides;
    }));
  }

  onTouchStart(event) {
    this.start = event.touches[0].pageX;
    this.x = this.start;
    addClass(this.el, CLASSES.DRAG);
  }

  /**
   * Cancel event if cancellable
   *
   * @param {Event} event
   */
  preventEvent(event) {
    if (event && event.cancelable) {
      event.preventDefault();
    }
  }

  onTouchEnd(event) {
    if ((event.target && event.target.tagName === 'A') || this.paused) {
      // Preventing odd bug in which links are detected as swipes some times.
      return;
    }

    const limit = this.itemWidth * 0.2;
    const delta = this.x - this.start;
    removeClass(this.el, CLASSES.DRAG);

    if (Math.abs(delta) >= limit) {
      this.preventEvent(event);

      if (delta < 0) {
        this.goNext();
      } else {
        this.goPrev();
      }
    } else {
      if (this.moved) {
        this.preventEvent(event);
        this.goToPage(this.currentPage);
      }
    }

    this.moved = false;
  }

  onTouchMove(event) {
    if (!this.options.transformsEnabled) {
      return;
    }

    this.x = event.touches[0].pageX;
    const delta = (this.x - this.start);
    const amount = this.getTransformAmount() + (this.x - this.start);

    // Allowing to scroll normally
    if (Math.abs(delta) < 15 || this.paused) {
      return;
    }

    this.preventEvent(event);

    if (amount > 30) {
      return;
    }

    this.moved = true;
    this.slides.forEach(item => {
      item.style[TRANSFORM_PROPERTY] = `translate3d(${amount}px,0,0)`;
    });
  }

  goToPage(newPage) {
    const oldPage = this.currentPage;
    this.currentPage = newPage;

    this.updateTransform();
    this.updateAria();

    fire(this.el, Carousel.Events.slideChange, {
      detail: {
        module: this,
        oldPage,
        newPage
      }
    });
  }

  goPrev() {
    if (this.currentPage > 0) {
      this.goToPage(this.currentPage - 1);
    } else {
      this.goToPage(this.currentPage);
    }
  }

  goNext() {
    if (this.currentPage < this.maxPages - 1) {
      this.goToPage(this.currentPage + 1);
    } else {
      this.goToPage(this.currentPage);
    }
  }

  getTransformAmount() {
    let amount = this.itemWidth * this.currentPage * this.slidesPerPages;

    if (amount) {
      amount *= -1;
      amount -= this.currentPage * this.margin * this.slidesPerPages;
    }

    return amount;
  }

  updateTransform() {
    if (!this.options.transformsEnabled) {
      return;
    }

    this.transformSlides();
  }

  transformSlides(amount = this.getTransformAmount()) {
    rAF(() => {
      this.slides.forEach(item => {
        item.style[TRANSFORM_PROPERTY] = `translate3d(${amount}px,0,0)`;
      });
    });
  }

  onResize() {
    this.updateSettings();
    this.calcBounds();
    let transformEnabled;

    if (this.options.transformOn) {
      transformEnabled = window.matchMedia(this.options.transformOn).matches;
    } else {
      transformEnabled = this.options.transformsEnabled;
    }

    if (transformEnabled !== this.options.transformsEnabled) {
      // If it's not enabled anymore
      if (this.options.transformsEnabled) {
        this.transformSlides(0);
      } else {
        this.transformSlides();
      }

      this.options.transformsEnabled = transformEnabled;
    } else if (this.options.transformsEnabled) {
      // Put the slides where they should be
      this.transformSlides();
    }
  }

  calcBounds() {
    this.itemWidth = this.slides[0].offsetWidth;
    this.margin = parseInt(
      window.getComputedStyle(this.slides[0]).marginRight, 10);
    let method;

    // Only for mobile
    if (this.isTouchEnabled) {
      method = on;
    } else {
      method = off;
    }

    method(this.el, 'touchstart', this.boundStart);
    method(this.el, 'touchend', this.boundEnd);
    method(this.el, 'touchmove', this.boundMove);
  }

  updateAria() {
    this.dots.forEach((button, i) => {
      button.setAttribute('aria-selected', `${i === this.currentPage}`);
    });

    this.slides.forEach((slide) => {
      slide.setAttribute('aria-hidden', 'true');
    });

    this.getSlidesForI(this.currentPage).forEach((slide) => {
      slide.setAttribute('aria-hidden', 'false');
    });

    this.updateNextPrevButtons(this.nextButtons, this.currentPage >= (this.maxPages - 1));
    this.updateNextPrevButtons(this.prevButtons, this.currentPage === 0);
  }

  updateNextPrevButtons(buttons, disable) {
    buttons.forEach(button => {
      if (button.tagName.toLowerCase() === 'button') {
        button.disabled = disable;
      } else {
        button.setAttribute('aria-disabled', disable.toString());
      }
    });
  }

  changeSlide(el, event, data) {
    this.preventEvent(event);
    const i = parseInt(data.index, 10) - 1;
    this.goToPage(i);
  }

  click(el, event, options) {
    if (!this.paused) {
      window.location = el.dataset.href;
    }
  }
}

Domodule.register('Carousel', Carousel);
