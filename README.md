# Carousel

Simple Carousel

## Module Options

* `autoslide`: Number of milliseconds to autoslide to next one.
* `match`: Media query on which the carousel shouldn't work with touch events. Useful if you want to disable touch events on tablets.

## Actions

* `changeSlide`: Navigates the carousel to a given slide. Needs parameter `index` (1 based)
* `click`: Allows a slide to be linked to whatever the `data-href` value is.

## Example markup

```html
<section class="carousel" data-module="Carousel" data-module-autoslide="4000">
  <div data-carousel-slides>
    <div data-carousel-slide></div>
    <div data-carousel-slide></div>
    <div data-carousel-slide></div>
    <div data-carousel-slide></div>
  </div>

  ... content

  <div data-carousel-slides>
    <div data-carousel-slide></div>
    <div data-carousel-slide></div>
    <div data-carousel-slide></div>
    <div data-carousel-slide></div>
  </div>


  <ul class="carousel-controls">
    <li><button class="carousel-control" data-action="changeSlide" data-action-index="1" aria-selected="true"></button></li>
    <li><button class="carousel-control" data-action="changeSlide" data-action-index="2" aria-selected="false"></button></li>
    <li><button class="carousel-control" data-action="changeSlide" data-action-index="3" aria-selected="false"></button></li>
    <li><button class="carousel-control" data-action="changeSlide" data-action-index="4" aria-selected="false></button></li>
  </ul>
</div>
```
