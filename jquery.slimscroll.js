/*! Copyright (c) 2011 Piotr Rochala (http://rocha.la)
 * Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 * and GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.
 *
 * Version: 1.0.9
 *
 * Modified and enhanced by Opoint AS (www.opoint.com), (c) 2013
 *
 * - Uses strict JavaScript;
 * - Using three equal signs instead of two (removes warnings in NetBeans);
 * - Passes in few additional global variables to main closure for better minification;
 * - Uses jQuery variable once through the main closure and $ otherwise;
 * - Normalized DOM's document object;
 * - Opt-in to using touch/mouse wheel (touch can be turned off if needed);
 * - Set hide/fade delay time;
 * - Configurable class name prefix (defaults to 'slimScroll');
 * - Support to showing scrollbar when mouse moves while inside target area;
 * - Added vertical distance (baseline) support;
 * - Added support for glowing border around rail.
 *
 * Version: 1.1.0.0
 *
 */

'use strict';

// used in various places, results in better minification
(function($, window, Math, parseInt, setTimeout, clearTimeout, TRUE, FALSE, NULL) {

  var document = window.document,

      INSTANCEID = 999,
      UUID = 'SS' + window.parseInt(+new Date / Math.random()),
      instances = {},

      // DIV string prototype
      divS = '<div/>',

      // Handy regex to test for numeric strings.
      RE_IS_NUMERIC = /^\d+(\.\d+)?px?$/,

      // Global variables (within the closure) used by all slimScroll instances.
      defaults = {
        wheelStep: 20,
        width: 'auto',
        height: '250px',
        size: '7px',
        restSize: '7px',
        color: '#000',
        position: 'right',
        distance: '3px',
        baseline: '3px',
        start: 'top',
        opacity: .4,
        alwaysVisible: FALSE,
        disableFadeOut: FALSE,
        railVisible: TRUE,
        railOpacity: .2,
        enableTouch: TRUE,
        enableWheel: TRUE,
        mouseSensitive: TRUE,
        railColor: '#333',
        useGlow: FALSE,
        useRounded: TRUE,
        glowColor: '#fff',
        glowSize: '3px',
        classPrefix: 'slimScroll',
        allowPageScroll: FALSE,
        scroll: 0,
        touchScrollStep: 200,
        fadeDelay: 400,
        hideDelay: 1000
      },

      // get extended CSS with multi-browser prefixes
      getExtendedCSS = function(entity, value) {
        var css = {};
        css['-webkit-' + entity] =
        css['-moz-' + entity]    =
        css['-ms-' + entity]     =
        css['-o-' + entity]      =
        css[entity]              = ('' + value);
        return css;
      },

      configureBorderRadius = function(rail, bar, size, useRounded) {
        var css = FALSE !== useRounded ? getExtendedCSS('border-radius', parseInt(size) + 'px') : {};
        css.width = size;
        rail.css(css);
        bar.css(css);
      },

      getPreferredScrollPos = function(scrollTop, targetEl) {
        if(0 < targetEl.length) {
          // Take only one item, if more than one matches.
          if(1 < targetEl.length)
            targetEl = $(targetEl[0]);

          // Calculate preferred position.
          scrollTop += targetEl.position().top;
          if(0 > scrollTop)
            scrollTop = 0;
        }
        return scrollTop;
      },

      // Last time when a mouse wheel scroll event happened.
      lastWheelEvent = 0,

      slimScroll = function() {
        var self = this,
            args = arguments,
            wrapper = $(divS);

        // Define all parameter inside this instance.
        (function(el, config) {
          // If a rest size is not passed, use the size instead.
          if(!config.restSize)
            config.restSize = '' + config.size;

          // Adjust few more options manually
          config.railClass = config.classPrefix + 'Rail',
          config.railWrapperClass = config.classPrefix + 'RailDiv',
          config.barClass = config.classPrefix + 'Bar',
          config.wrapperClass = config.classPrefix + 'Div';

          $.extend(self, config, {
            el: el,
            isOverPanel: FALSE,
            railW: $(divS),
            isOverRailW: FALSE,
            rail: $(divS),
            isOverRail: FALSE,
            bar: $(divS),
            isOverBar: FALSE,
            minBarHeight: 30,
            isDragging: FALSE,
            touchDiff: 0,
            barHeight: 0,
            percentScroll: 0,
            lastScroll: 0,
            releaseScroll: FALSE,
            scrollTo: 0,
            restHideTimer: NULL,
            restShowTimer: NULL,
            restResetTimer: NULL
          });
        })(args[0], args[1]);

        // Adjust scrollbar's rail wrapper styles.
        self.railW.addClass(self.railWrapperClass).css({
          display: 'block',
          position: 'absolute',
          width: self.size,
          top: self.baseline,
          bottom: self.baseline,
          background: 'transparent none',
          zIndex: 90
        });

        // Adjust scrollbar's rail styles.
        self.rail.addClass(self.railClass).css({
          display: (self.alwaysVisible && self.railVisible) ? 'block' : 'none',
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: self.restSize,
          background: self.railColor,
          opacity: self.railOpacity,
          zIndex: 95
        });

        // Adjust scrollbar styles.
        self.bar.addClass(self.barClass).css({
          display: self.alwaysVisible ? 'block' : 'none',
          position: 'absolute',
          top: 0,
          right: 0,
          width: self.restSize,
          background: self.color,
          opacity: self.opacity,
          zIndex: 99
        });

        // Adjust main element's wrapper styles.
        wrapper.addClass(self.wrapperClass).css({
          display: 'block',
          position: 'relative',
          overflow: 'hidden',
          width: self.width,
          height: self.height
        });

        // wrap target (this) DOM element
        self.el.wrap(wrapper);

        // Set border radius for rail and scrollbar.
        if(0 < parseInt(self.size))
          configureBorderRadius(self.rail, self.bar, self.restSize, self.useRounded);

        // Check if a glow should be added too
        if(self.useGlow && 0 < parseInt(self.glowSize))
          self.rail.css(getExtendedCSS('box-shadow', self.glowColor + ' 0 0 ' + self.glowSize));

        // Optionally set height to the parent's height.
        self.height = 'auto' === self.height
          ? self.el.parent().innerHeight()
          : self.height;

        // Update style for main element.
        self.el.css({
          overflow: 'hidden',
          width: self.width,
          height: self.height
        });

        // set rail wrapper position
        self.railW.css('left' !== self.position.toLowerCase() ? 'right' : 'left', self.distance);

        // append rail and scrollbar to the rail wrapper
        self.railW.append(self.rail);
        self.railW.append(self.bar);

        // append rail wrapper right after the scrolled element (this DOM element)
        self.el.after(self.railW);

        self.attachMouseEvents();

        // Support for mobile touch events.
        if(self.enableTouch) {
          self.el.bind('touchstart', function(e) {
            if(e.originalEvent.touches.length) {
              // Record where touch started.
              self.touchDiff = e.originalEvent.touches[0].pageY;
            }
          });

          self.el.bind('touchmove', function(e) {
            // Prevent scrolling the page.
            e.originalEvent.preventDefault();

            if(e.originalEvent.touches.length)
              // See how far user swiped and scroll content
              self.scrollContent((self.touchDiff - e.originalEvent.touches[0].pageY) / self.touchScrollStep, TRUE);
          });
        }

        // Set up initial height.
        self.getBarHeight();

        // Check start position.
        if('bottom' === self.start) {
          // Scroll content to bottom.
          self.bar.css({top: self.getRailWrapperHeight() - self.bar.outerHeight()});
          self.scrollContent(0, TRUE);
        } else if('object' === typeof self.start) {
          // Scroll content.
          self.scrollContent($(self.start).position().top, NULL, TRUE);

          // Make sure bar stays hidden.
          if(!self.alwaysVisible)
            self.bar.hide();
        }

        // Make sure rail wrapper starts up hidden.
        if(!self.alwaysVisible && !self.railVisible)
          self.hideRailWrapper();
      },

      jQueryPlugin = function(options) {
        var self = this;

        // Do it for every element that matches selector.
        self.each(function() {
          var dom = this;

          // Ensure we are binding it once.
          if(!dom[UUID] || !instances[dom[UUID]]) {
            dom[UUID] = ++INSTANCEID;
            instances[dom[UUID]] = new slimScroll($(dom), $.extend({}, defaults, options));
          } else {
            instances[dom[UUID]].doAction(options);
          }
        });

        // Maintain chainability.
        return self;
      };

  // Extend jQuery's prototype and define slimScroll.
  $.fn.extend({
    slimScroll: jQueryPlugin,
    slimscroll: jQueryPlugin
  });

  // Define slimScroll's prototype.
  $.extend(slimScroll.prototype, {
    doAction: function(options) {
      var self = this,
          el = self.el,
          variable,

          // Start from last bar position.
          scrollTo = el.scrollTop();

      self.getBarHeight();

      // Check if we should scroll existing instance.
      if('destroy' in options) {
        // remove slimscroll elements
        self.railW.remove();
        el.unbind();
        el.unwrap();

        // Detach mouse wheel events.
        self.detachMouseWheel();
      } else {
        // Set new HTML inside scroller.
        if('html' in options) {
          self.el.html(options['html']);

          // Setting new HTML unbinds all events on the DOM element,
          // and also its children. See:
          // http://friendlybit.com/js/manipulating-innerhtml-removes-events/
          // Anyway, we do it manually too, maybe this changes in the future.
          self.detachMouseWheel();
          self.attachMouseEvents(FALSE);
        }
        if('scrollTo' in options) {
          // Jump to a static point (DOM node or numeric).
          variable = typeof options.scrollTo;
          if ('number' === variable || ('string' === variable && RE_IS_NUMERIC.test(variable)))
            scrollTo = parseInt(options.scrollTo);
          else
            scrollTo = getPreferredScrollPos(scrollTo, $(options.scrollTo, el));
        } else if('scrollBy' in options) {
          // Jump by value pixels.
          scrollTo += parseInt(options.scrollBy);
        }

        // Scroll content by the given offset.
        self.scrollContent(scrollTo, FALSE, TRUE);
      }
    },

    restResetStyles: function() {
      var self = this;
      if(!self.restResetTimer)
        self.restResetTimer = setInterval($.proxy(self.restResetStyles, self), 100);
      else
        if(!self.isOverRailW && !self.isDragging) {
          clearInterval(self.restResetTimer);
          self.restResetTimer = undefined;
          configureBorderRadius(self.rail, self.bar, self.restSize, self.useRounded);
        }
    },

    handleEvent: function(e) {
      var self = this, delta = 0, currentWheelEvent;

      // Use mouse wheel only when mouse is over the DOM element.
      if(!self.isOverPanel)
        return;

      // Detect concurrent wheel events (10msec between events).
      currentWheelEvent = +new window.Date;
      if(currentWheelEvent < lastWheelEvent + 10)
        return;

      // Normalize event object.
      if(!e)
        e = window.event;

      if(e.wheelDelta)
        delta = -e.wheelDelta / 120;

      if(e.detail)
        delta = e.detail / 3;

      // Scroll content.
      if($(e.target || e.srcTarget).closest('.' + self.wrapperClass).is(self.el.parent()))
        self.scrollContent(delta, TRUE);

      // Stop window scroll.
      if(e.preventDefault && !self.releaseScroll)
        e.preventDefault();

      if(!self.releaseScroll)
        e.returnValue = FALSE;

      lastWheelEvent = currentWheelEvent;
    },

    detachMouseWheel: function() {
      var self = this, dom = self.el[0];
      if(dom.addEventListener) {
        dom.removeEventListener('DOMMouseScroll', self, FALSE);
        dom.removeEventListener('mousewheel', self, FALSE);
      } else {
        document.detachEvent('onmousewheel', self);
      }
    },

    attachMouseEvents: function(/*enableWheel*/) {
      var self = this,
          el = self.el,
          dom,
          bar = self.bar,
          rail = self.rail;

      // Make scrollbar draggable.
      try { bar.draggable('destroy'); } catch (ignored) { }
      bar.draggable({
        axis: 'y',
        containment: 'parent',
        start: function(){
          self.isDragging = TRUE;
        },
        stop: function(){
          self.isDragging = FALSE;
          self.hideBar();
        },
        drag: function(evt){
          // scroll content
          self.scrollContent(0, FALSE, FALSE);
        }
      });

      // On rail over.
      try { rail.unbind('mouseenter mouseleave'); } catch (ignored) { }
      rail.hover(function(){
        self.showBar();
        self.isOverRail = self.railVisible;
      }, function(){
        self.hideBar();
        self.isOverRail = FALSE;
      });

      // On bar over.
      try { bar.unbind('mouseenter mouseleave'); } catch (ignored) { }
      bar.hover(function(){
        self.isOverBar = TRUE;
      }, function(){
        self.isOverBar = FALSE;
      });

      // Show on parent mouseover.
      try { el.unbind('mouseenter mouseleave'); } catch (ignored) { }
      el.hover(function(){
        self.isOverPanel = TRUE;
        self.showBar();
        self.hideBar();
      }, function(){
        self.isOverPanel = FALSE;
        self.hideBar();
      });

      // Show/Hide scrollbar when mouse moves?
      if(self.mouseSensitive) {
        // Show on mouseover.
        try { el.unbind('mousemove'); } catch (ignored) { }
        el.mousemove(function(){
          self.isOverPanel = TRUE;
          self.showBar();
          self.hideBar();
        });

        // Hide on mouseleave.
        try { el.unbind('mouseleave'); } catch (ignored) { }
        el.mouseleave(function(){
          self.isOverPanel = FALSE;
          self.hideBar();
        });
      }

      // If rest size is different than size, attach a hover handler on railW.
      if(self.size != self.restSize) {
        try { self.railW.unbind('mouseenter mouseleave'); } catch (ignored) { }
        self.railW.hover(
          // ON.
          function() {
            self.isOverRailW = TRUE;
            if(!self.restShowTimer) {
              self.restShowTimer = setTimeout(function() {
                self.restShowTimer = undefined;
                if(self.restHideTimer) {
                  clearTimeout(self.restHideTimer);
                  self.restHideTimer = undefined;
                }
                configureBorderRadius(self.rail, self.bar, self.size, self.useRounded);
              }, 200);
            }
          },

          // OFF.
          function() {
            self.isOverRailW = FALSE;
            if(self.restShowTimer) {
              clearTimeout(self.restShowTimer);
              self.restShowTimer = undefined;
            }
            if(self.restHideTimer) {
              clearTimeout(self.restHideTimer);
            }
            self.restHideTimer = setTimeout(function() {
              self.restHideTimer = undefined;
              self.restResetStyles();
            }, self.hideDelay / 2);
          }
        );
      }

      // Detach mouse wheel events.
//              self.detachMouseWheel();

      // Reattach mouse wheel events.
      if(/*FALSE !== enableWheel &&*/ self.enableWheel) {
        dom = el[0];
        if(dom.addEventListener) {
          dom.addEventListener('DOMMouseScroll', self, FALSE);
          dom.addEventListener('mousewheel', self, FALSE);
        } else {
          document.attachEvent('onmousewheel', self);
        }
      }
    },

    getRailWrapperHeight: function() {
      var self = this, el = self.el;
      return Math.max(self.railW.outerHeight(), el.outerHeight() - 2 * parseInt(self.baseline));
    },

    scrollContent: function(yPos, isWheel, isJump) {
      var self = this,
          el = self.el,
          bar = self.bar,
          railWH = self.getRailWrapperHeight(),
          maxTop = Math.max(0, railWH - bar.outerHeight()),
          delta;

      if(isWheel) {
        // Move bar with mouse wheel.
        delta = parseInt(bar.css('top')) + yPos * parseInt(self.wheelStep) / 100 * railWH;

        // Move bar, make sure it doesn't go out.
        delta = Math.min(Math.max(delta, 0), maxTop);

        // If scrolling down, make sure a fractional change to the
        // scroll position isn't rounded away when the scrollbar's CSS is set
        // this flooring of delta would happened automatically when
        // bar.css is set below, but we floor here for clarity.
        delta = (yPos > 0) ? Math.ceil(delta) : Math.floor(delta);

        // Scroll the scrollbar.
        bar.css({ top: delta + 'px' });
      }

      // Calculate actual scroll amount.
      self.percentScroll = parseInt(bar.css('top')) / maxTop;
      delta = self.percentScroll * (el[0].scrollHeight - el.outerHeight());

      if(isJump) {
        delta = yPos;
        var offsetTop = delta / el[0].scrollHeight * railWH;
        offsetTop = Math.min(Math.max(offsetTop, 0), maxTop);
        bar.css({top: offsetTop + 'px'});
      }

      // Scroll content.
      el.scrollTop(delta);

      // Ensure bar is visible.
      self.showBarIfNeeded(TRUE);

      // Trigger hide when scroll is stopped.
      self.hideBar();
    },

    getBarHeight: function() {
      var self = this;

      // calculate scrollbar height and make sure it is not too small
      self.barHeight = Math.max((self.el.outerHeight() / self.el[0].scrollHeight) * self.getRailWrapperHeight(), self.minBarHeight);
      self.bar.css({height: self.barHeight + 'px'});
    },

    hideRailWrapper: function() {
      this.railW.css({visibility: 'hidden'});
    },

    showRailWrapper: function() {
      this.railW.css({visibility: 'visible'});
    },

    clearTimer: function() {
      var self = this;
      if(self.queueHide) {
        try { clearTimeout(self.queueHide); } catch(ignored) {}
        self.queueHide = undefined;
      }
      try { delete self.queueHide; } catch(ignored) {}
    },

    showBarIfNeeded: function(forceHide) {
      var self = this;

      // Recalculate bar height.
      self.getBarHeight();

      // Show only when required.
      if(self.barHeight >= self.getRailWrapperHeight()) {
        self.releaseScroll = TRUE;
        if(TRUE === forceHide) {
          if(self.railVisible) {
            self.rail.hide();
          }
          self.bar.hide();
        }
      } else {
        if(self.railVisible) {
          self.rail.stop(TRUE, TRUE).fadeIn(self.fadeDelay);
        }
        self.bar.stop(TRUE, TRUE).fadeIn(self.fadeDelay);
      }

      // Show the rail wrapper.
      self.showRailWrapper();
    },

    showBar: function() {
      var self = this;

      // Clear the timer responsible for hiding the scrollbar.
      self.clearTimer();

      // Show the scroll bar only if needed.
      self.showBarIfNeeded();

      // When bar reached top or bottom.
      if(!self.releaseScroll && self.percentScroll === ~~ self.percentScroll) {
        // Release wheel.
        self.releaseScroll = self.allowPageScroll;

        // Publish approporiate event.
        if(self.lastScroll !== self.percentScroll)
          self.el.trigger('slimscroll', 0 === ~~self.percentScroll ? 'top' : 'bottom');
      }
      self.lastScroll = self.percentScroll;
    },

    hideBar: function() {
      var self = this;

      // Only hide when options allow it.
      if(!self.alwaysVisible) {
        self.clearTimer();
        self.queueHide = setTimeout(function() {
          self.clearTimer();
          if(!(self.disableFadeOut && self.isOverPanel) && !self.isOverRail && !self.isOverBar && !self.isDragging) {
            if(self.railVisible)
              self.rail.fadeOut(self.fadeDelay);
            self.bar.fadeOut(self.fadeDelay, $.proxy(self.hideRailWrapper, self));
          }
        }, self.hideDelay);
      }
    }
  });

})(jQuery, window, Math, parseInt, setTimeout, clearTimeout, !0, !1, null);
