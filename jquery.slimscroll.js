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
 * Version: 1.0.9.5
 *
 */

'use strict';

// used in various places, results in better minification
(function($, window, Math, parseInt, TRUE, FALSE, NULL) {

  // Global variables (within the closure) used by all slimScroll instances.
  var defaults = {
        wheelStep: 20,
        width: 'auto',
        height: '250px',
        size: '7px',
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

      // DIV string prototype
      divS = '<div/>',

      // override defaults with user's options
      configureInstance = function(options) {
        // override defaults with user's options
        var config = $.extend(defaults, options);

        // If a rest size is not passed, use the size instead.
        if(!options.restSize) {
          config.restSize = '' + config.size;
        }

        // adjust few more options manually
        config.railClass = config.classPrefix + 'Rail',
        config.railWrapperClass = config.classPrefix + 'RailDiv',
        config.barClass = config.classPrefix + 'Bar',
        config.wrapperClass = config.classPrefix + 'Div';

        return config;
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

      // Normalize document.
      document = window.document,

      // Last time when a mouse wheel scroll event happened.
      lastWheelEvent = 0;

  // extend jQuery's prototype and define slimScroll.
  $.fn.extend({
    slimScroll: function(options) {

      // override defaults with user's options
      var config = configureInstance(options);

      // do it for every element that matches selector
      this.each(function() {
        var isOverPanel, isOverRail, isOverBar, isDragg, touchDiff,
            barHeight, percentScroll, lastScroll,
            minBarHeight = 30,
            releaseScroll = FALSE,
            scrollTo,
            variable,

            // used in event handlers and for better minification
            dom = this, me = $(dom),

            // create scrollbar rail
            rail = $(divS)
              .addClass(config.railClass)
              .css({
                display: (config.alwaysVisible && config.railVisible) ? 'block' : 'none',
                position: 'absolute',
                top: 0,
                bottom: 0,
                right: 0,
                width: config.restSize,
                background: config.railColor,
                opacity: config.railOpacity,
                zIndex: 95
              }),

            // create scrollbar
            bar = $(divS)
              .addClass(config.barClass)
              .css({
                display: config.alwaysVisible ? 'block' : 'none',
                position: 'absolute',
                top: 0,
                right: 0,
                width: config.restSize,
                background: config.color,
                opacity: config.opacity,
                zIndex: 99
              }),

            mouseWheelHandler = function(evt) {
              var delta = 0, currentWheelEvent;

              // Use mouse wheel only when mouse is over the DOM element.
              if (!isOverPanel)
                return;

              // Detect concurrent wheel events (10msec between events).
              currentWheelEvent = +new window.Date;
              if(currentWheelEvent < lastWheelEvent + 10)
                return;

              // Normalize event object.
              evt || (evt = window.event);

              if (evt.wheelDelta) {
                delta = -evt.wheelDelta / 120;
              }

              if (evt.detail) {
                delta = evt.detail / 3;
              }

              if ($(evt.target || evt.srcTarget).closest('.' + config.wrapperClass).is(me.parent())) {
                // scroll content
                scrollContent(delta, TRUE);
              }

              // stop window scroll
              if (evt.preventDefault && !releaseScroll) {
                evt.preventDefault();
              }

              if (!releaseScroll) {
                evt.returnValue = FALSE;
              };

              lastWheelEvent = currentWheelEvent;
            },

            detachMouseWheel = function() {
              if (dom.addEventListener) {
                dom.removeEventListener('DOMMouseScroll', mouseWheelHandler, FALSE);
                dom.removeEventListener('mousewheel', mouseWheelHandler, FALSE);
              } else {
                document.detachEvent('onmousewheel', mouseWheelHandler);
              }
            },

            attachMouseEvents = function() {
              // make scrollbar draggable
              try { bar.draggable('destroy'); } catch (ignored) { }
              bar.draggable({
                axis: 'y',
                containment: 'parent',
                start: function(){
                  isDragg = TRUE;
                },
                stop: function(){
                  isDragg = FALSE;
                  hideBar();
                },
                drag: function(evt){
                  // scroll content
                  scrollContent(0, FALSE, FALSE);
                }
              });

              // attach events when not requested to show rail always.
              if (!config.alwaysVisible) {
                // on rail over
                try { rail.unbind('mouseenter mouseleave'); } catch (ignored) { }
                rail.hover(function(){
                  showBar();
                  isOverRail = config.railVisible;
                }, function(){
                  hideBar();
                  isOverRail = FALSE;
                });

                // on bar over
                try { bar.unbind('mouseenter mouseleave'); } catch (ignored) { }
                bar.hover(function(){
                  isOverBar = TRUE;
                }, function(){
                  isOverBar = FALSE;
                });

                // show on parent mouseover
                try { me.unbind('mouseenter mouseleave'); } catch (ignored) { }
                me.hover(function(){
                  isOverPanel = TRUE;
                  showBar();
                  hideBar();
                }, function(){
                  isOverPanel = FALSE;
                  hideBar();
                });

                // show/hide scrollbar when mouse moves?
                if (config.mouseSensitive) {
                  // show on mouseover
                  try { me.unbind('mousemove'); } catch (ignored) { }
                  me.mousemove(function(){
                    isOverPanel = TRUE;
                    showBar();
                    hideBar();
                  });

                  // hide on mouseleave
                  try { me.unbind('mouseleave'); } catch (ignored) { }
                  me.mouseleave(function(){
                    isOverPanel = FALSE;
                    hideBar();
                  });
                }
              }

              // detach mouse wheel events
              detachMouseWheel();

              // re-attach mouse wheel events
              if (config.enableWheel) {
                if (dom.addEventListener) {
                  dom.addEventListener('DOMMouseScroll', mouseWheelHandler, FALSE);
                  dom.addEventListener('mousewheel', mouseWheelHandler, FALSE);
                } else {
                  document.attachEvent('onmousewheel', mouseWheelHandler);
                }
              }
            },

            getRailWrapper = function() {
              // The rail wrapper appears always after the target DOM element.
              return me.next();
            },

            getRailWrapperHeight = function() {
              return Math.max(getRailWrapper().outerHeight(), me.outerHeight() - 2 * config.baseline);
            },

            scrollContent = function(yPos, isWheel, isJump) {
              var railWH = getRailWrapperHeight(),
                  maxTop = Math.max(0, railWH - bar.outerHeight()),
                  delta;

              if (isWheel) {
                // move bar with mouse wheel
                delta = parseInt(bar.css('top')) + yPos * parseInt(config.wheelStep) / 100 * railWH;

                // move bar, make sure it doesn't go out
                delta = Math.min(Math.max(delta, 0), maxTop);

                // if scrolling down, make sure a fractional change to the
                // scroll position isn't rounded away when the scrollbar's CSS is set
                // this flooring of delta would happened automatically when
                // bar.css is set below, but we floor here for clarity
                delta = (yPos > 0) ? Math.ceil(delta) : Math.floor(delta);

                // scroll the scrollbar
                bar.css({ top: delta + 'px' });
              }

              // calculate actual scroll amount
              percentScroll = parseInt(bar.css('top')) / maxTop;
              delta = percentScroll * (me[0].scrollHeight - me.outerHeight());

              if (isJump) {
                // If jumping to a specific location, hide the rail and bar.
                // They'll be later shown when scrolling is done.
                bar.hide();
                if (config.railVisible)
                  rail.hide();

                delta = yPos;
                var offsetTop = delta / me[0].scrollHeight * railWH;
                offsetTop = Math.min(Math.max(offsetTop, 0), maxTop);
                bar.css({top: offsetTop + 'px'});
              }

              // scroll content
              me.scrollTop(delta);

              // ensure bar is visible
              showBar();

              // trigger hide when scroll is stopped
              hideBar();
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

            getBarHeight = function() {
              // calculate scrollbar height and make sure it is not too small
              barHeight = Math.max((me.outerHeight() / me[0].scrollHeight) * getRailWrapperHeight(), minBarHeight);
              bar.css({height: barHeight + 'px'});
            },

            hideRailWrapper = function() {
              getRailWrapper().css({visibility: 'hidden'});
            },

            showRailWrapper = function() {
              getRailWrapper().css({visibility: 'visible'});
            },

            clearTimer = function() {
              if (dom.queueHide) {
                clearTimeout(dom.queueHide);
                dom.queueHide = NULL;
              }
            },

            showBar = function() {
              // clear the timer responsible for hiding the scrollbar
              clearTimer();

              // recalculate bar height
              getBarHeight();

              // when bar reached top or bottom
              if (percentScroll === ~~ percentScroll) {
                //release wheel
                releaseScroll = config.allowPageScroll;

                // publish approporiate event
                if (lastScroll !== percentScroll) {
                    me.trigger('slimscroll', (~~percentScroll === 0) ? 'top' : 'bottom');
                }
              }
              lastScroll = percentScroll;

              // show only when required
              if(barHeight >= getRailWrapperHeight()) {
                //allow window scroll
                releaseScroll = TRUE;
              } else {
                if (config.railVisible) {
                  rail.stop(TRUE, TRUE).fadeIn(config.fadeDelay);
                }
                bar.stop(TRUE, TRUE).fadeIn(config.fadeDelay);
              }

              // show the rail wrapper
              showRailWrapper();
            },

            hideBar = function() {
              // only hide when options allow it
              if (!config.alwaysVisible) {
                clearTimer();
                dom.queueHide = setTimeout(function() {
                  dom.queueHide = NULL;
                  if (!(config.disableFadeOut && isOverPanel) && !isOverRail && !isOverBar && !isDragg) {
                    if (config.railVisible) {
                      rail.fadeOut(config.fadeDelay);
                    }
                    bar.fadeOut(config.fadeDelay, hideRailWrapper);
                  }
                }, config.hideDelay);
              }
            };

        // ensure we are not binding it again
        if (me.parent().hasClass(config.classPrefix + 'Div')) {
            // start from last bar position
            scrollTo = me.scrollTop();

            // find bar and rail
            rail = me.parent().find('.' + config.classPrefix + 'Rail');
            bar = me.parent().find('.' + config.classPrefix + 'Bar');

            getBarHeight();

            // check if we should scroll existing instance
            if (options) {
              // Set new HTML inside scroller.
              if ('html' in options) {
                me.html(options['html']);

                // Setting new HTML unbinds all events on the DOM element,
                // and also its children. See:
                // http://friendlybit.com/js/manipulating-innerhtml-removes-events/
                // Anyway, we do it manually too, maybe this changes in the future.
                detachMouseWheel();
                attachMouseEvents();
              }
              if ('scrollTo' in options) {
                // jump to a static point (DOM node or numeric)
                variable = typeof config.scrollTo;
                if ('number' === variable || ('string' === variable && /^\d+(\.\d+)?px?$/.test(variable)))
                  scrollTo = parseInt(config.scrollTo);
                else
                  scrollTo = getPreferredScrollPos(scrollTo, $(config.scrollTo, me));
              } else if ('scrollBy' in options) {
                // jump by value pixels
                scrollTo += parseInt(config.scrollBy);
              } else if ('destroy' in options) {
                // remove slimscroll elements
                getRailWrapper().remove();
                me.unbind();
                me.unwrap();

                // detach mouse wheel events.
                detachMouseWheel();

                return;
              }

              // scroll content by the given offset
              scrollContent(scrollTo, FALSE, TRUE);
            }

            return;
        } else {
          // set border radius for rail and scrollbar
          if(parseInt(config.size) > 0) {
            configureBorderRadius(rail, bar, config.restSize, config.useRounded);
          }

          // check if a glow should be added too
          if (config.useGlow && parseInt(config.glowSize) > 0) {
            rail.css(getExtendedCSS('box-shadow', config.glowColor + ' 0 0 ' + config.glowSize));
          }
        }

        // optionally set height to the parent's height
        config.height = (config.height === 'auto') ? me.parent().innerHeight() : config.height;

        // update style for the div
        me.css({
          overflow: 'hidden',
          width: config.width,
          height: config.height
        });

        // wrap target (this) DOM element
        (function(wrapper) {
          // wrap content
          wrapper.addClass(config.wrapperClass);
          wrapper.css({
            display: 'block',
            position: 'relative',
            overflow: 'hidden',
            width: config.width,
            height: config.height
          });
          me.wrap(wrapper);
        })($(divS));

        // set up a rail wrapper to hold scrollbar and rail
        (function(railW, css) {
          // set rail wrapper position
          css[config.position === 'right' ? 'right' : 'left'] = config.distance;

          railW.addClass(config.railWrapperClass);
          railW.css(css);

          // append rail and scrollbar to the rail wrapper
          railW.append(rail);
          railW.append(bar);

          // If rest size is different than size, attach a hover handler on railW.
          if(config.size != config.restSize) {
            (function(size, restSize, useRounded) {
              var hideTimer,
                  showTimer,
                  resetTimer,
                  isHovering,
                  resetStyles = function() {
                    if(!resetTimer) {
                      resetTimer = setInterval(resetStyles, 100);
                    } else {
                      if(!isHovering && !isDragg) {
                        clearInterval(resetTimer);
                        resetTimer = undefined;
                        configureBorderRadius(rail, bar, restSize, useRounded);
                      }
                    }
                  };

              railW.hover(
                // ON.
                function() {
                  isHovering = TRUE;
                  if(!showTimer) {
                    showTimer = setTimeout(function() {
                      showTimer = undefined;
                      if(hideTimer) {
                        clearTimeout(hideTimer);
                        hideTimer = undefined;
                      }
                      configureBorderRadius(rail, bar, size, useRounded);
                    }, 200);
                  }
                },

                // OFF.
                function() {
                  isHovering = FALSE;
                  if(showTimer) {
                    clearTimeout(showTimer);
                    showTimer = undefined;
                  }
                  if(hideTimer) {
                    clearTimeout(hideTimer);
                  }
                  hideTimer = setTimeout(function() {
                    hideTimer = undefined;
                    resetStyles();
                  }, config.hideDelay / 2);
                }
              );
            })(config.size, config.restSize, config.useRounded);
          }

          // append rail wrapper to parent div
          me.parent().append(railW);
        })(
          $(divS),
          {
            display: 'block',
            position: 'absolute',
            width: config.size,
            top: config.baseline,
            bottom: config.baseline,
            background: 'transparent none',
            zIndex: 90
          }
        );

        attachMouseEvents();

        // support for mobile
        if (config.enableTouch) {
          me.bind('touchstart', function(e,b) {
            if (e.originalEvent.touches.length) {
              // record where touch started
              touchDiff = e.originalEvent.touches[0].pageY;
            }
          });

          me.bind('touchmove', function(evt) {
            // prevent scrolling the page
            evt.originalEvent.preventDefault();
            if (evt.originalEvent.touches.length) {
              // see how far user swiped
              var diff = (touchDiff - evt.originalEvent.touches[0].pageY) / config.touchScrollStep;
              // scroll content
              scrollContent(diff, TRUE);
            }
          });
        }

        // set up initial height
        getBarHeight();

        // check start position
        if (config.start === 'bottom') {
          // scroll content to bottom
          bar.css({ top: getRailWrapperHeight() - bar.outerHeight() });
          scrollContent(0, TRUE);
        } else if (typeof config.start === 'object') {
          // scroll content
          scrollContent($(config.start).position().top, NULL, TRUE);

          // make sure bar stays hidden
          if (!config.alwaysVisible)
          {
            bar.hide();
          }
        }

        // make sure rail wrapper starts up hidden
        if (!config.alwaysVisible && !config.railVisible) {
          hideRailWrapper();
        }
      });

      // maintain chainability
      return this;
    }
  });

  // backward compatibility / fill-in for using slimscroll (lowercase s)
  $.fn.extend({
    slimscroll: $.fn.slimScroll
  });

})(jQuery, window, Math, parseInt, !0, !1, null);
