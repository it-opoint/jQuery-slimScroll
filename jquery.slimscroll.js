/*! Copyright (c) 2011 Piotr Rochala (http://rocha.la)
 * Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 * and GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.
 *
 * Version: 1.0.9
 *
 *! Modified and enhanced by Opoint AS (www.opoint.com), (c) 2013
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
 * Version: 1.0.9.3
 *
 */

"use strict";

// used in various places, results in better minification
(function($, window, Math, parseInt, TRUE, FALSE, NULL) {

  // Global variables (within the closure) used by all slimScroll instances.
  var defaults =
      {
        wheelStep : 20,
        width : 'auto',
        height : '250px',
        size : '7px',
        color: '#000',
        position : 'right',
        distance : '3px',
        baseline : '3px',
        start : 'top',
        opacity : .4,
        alwaysVisible : FALSE,
        disableFadeOut: FALSE,
        railVisible : TRUE,
        railOpacity : .2,
        enableTouch : TRUE,
        enableWheel : TRUE,
        mouseSensitive : TRUE,
        railColor : '#333',
        useGlow : FALSE,
        glowColor : '#fff',
        glowSize : '3px',
        classPrefix : 'slimScroll',
        allowPageScroll : FALSE,
        scroll : 0,
        touchScrollStep : 200,
        fadeDelay : 400,
        hideDelay : 1000
      },

      // DIV string prototype
      divS = '<div/>',

      // override defaults with user's options
      configureInstance = function(options)
      {
        // override defaults with user's options
        var config = $.extend(defaults, options);

        // adjust few more options manually
        config.railClass = config.classPrefix + 'Rail',
        config.railWrapperClass = config.classPrefix + 'RailDiv',
        config.barClass = config.classPrefix + 'Bar',
        config.wrapperClass = config.classPrefix + 'Div';

        return config;
      },

      // get extended CSS with multi-browser prefixes
      getExtendedCSS = function(entity, value)
      {
        var css = {};
        css['-webkit-' + entity] =
        css['-moz-' + entity]    =
        css['-ms-' + entity]     =
        css['-o-' + entity]      =
        css[entity]              = value;
        return css;
      };

  // extend jQuery's prototype and define slimScroll.
  $.fn.extend({
    slimScroll: function(options) {

      // override defaults with user's options
      var config = configureInstance(options);

      // do it for every element that matches selector
      this.each(function(){

        var isOverPanel, isOverBar, isDragg, queueHide, touchDif,
            barHeight, percentScroll, lastScroll,
            minBarHeight = 30,
            releaseScroll = FALSE,
            reuseable,

            // used in event handlers and for better minification
            dom = this, me = $(dom),

            // wrap content
            wrapper = $(divS)
              .addClass(config.wrapperClass)
              .css({
                position: 'relative',
                overflow: 'hidden',
                width: config.width,
                height: config.height
              }),

            // rail+scrollbar wrapper
            railW = $(divS)
              .addClass(config.railWrapperClass)
              .css({
                position: 'absolute',
                overflow: 'hidden',
                width: config.size,
                top: config.baseline,
                bottom: config.baseline,
                background: 'transparent none',
                zIndex: 90
              }),

            // create scrollbar rail
            rail  = $(divS)
              .addClass(config.railClass)
              .css({
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                display: (config.alwaysVisible && config.railVisible) ? 'block' : 'none',
                background: config.railColor,
                opacity: config.railOpacity,
                zIndex: 95
              }),

            // create scrollbar
            bar = $(divS)
              .addClass(config.barClass)
              .css({
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                background: config.color,
                opacity: config.opacity,
                display: config.alwaysVisible ? 'block' : 'none',
                zIndex: 99
              });

        // ensure we are not binding it again
        if (me.parent().hasClass(config.classPrefix + 'Div'))
        {
            // start from last bar position
            reuseable = me.scrollTop();

            // find bar and rail
            rail = me.parent().find('.' + config.classPrefix + 'Rail');
            bar = me.parent().find('.' + config.classPrefix + 'Bar');

            getBarHeight();

            // check if we should scroll existing instance
            if (options)
            {
              if ('scrollTo' in options)
              {
                // jump to a static point
                reuseable = parseInt(config.scrollTo);
              }
              else if ('scrollBy' in options)
              {
                // jump by value pixels
                reuseable += parseInt(config.scrollBy);
              }
              else if ('destroy' in options)
              {
                // remove slimscroll elements
                bar.remove();
                rail.remove();
                me.unwrap();
                return;
              }

              // scroll content by the given offset
              scrollContent(reuseable, FALSE, TRUE);
            }

            return;
        }
        else
        {
          // set border radius for rail and scrollbar
          if(parseInt(config.size) > 0)
          {
            reuseable = getExtendedCSS('border-radius', config.size);
            rail.css(reuseable);
            bar.css(reuseable);
          }

          // check if a glow should be added too
          if (config.useGlow && parseInt(config.glowSize) > 0)
          {
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

        // set rail wrapper position
        railW.css((config.position === 'right') ? { right: config.distance } : { left: config.distance });

        // wrap target (this) DOM element
        me.wrap(wrapper);

        // append rail and scrollbar to the rail wrapper
        railW.append(rail);
        railW.append(bar);

        // append rail wrapper to parent div
        me.parent().append(railW);

        // make scrollbar draggable
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
          drag: function(e){
            // scroll content
            scrollContent(0, FALSE, FALSE);
          }
        });

        // attach events when not requested to show rail always.
        if (!config.alwaysVisible)
        {
          // on rail over
          rail.hover(function(){
            showBar();
          }, function(){
            hideBar();
          });

          // on bar over
          bar.hover(function(){
            isOverBar = TRUE;
          }, function(){
            isOverBar = FALSE;
          });

          // show on parent mouseover
          me.hover(function(){
            isOverPanel = TRUE;
            showBar();
            hideBar();
          }, function(){
            isOverPanel = FALSE;
            hideBar();
          });

          // show/hide scrollbar when mouse moves?
          if (config.mouseSensitive)
          {
            // show on mouseover
            me.mousemove(function(){
              isOverPanel = TRUE;
              showBar();
              hideBar();
            });

            // hide on mouseleave
            me.mouseleave(function(){
              isOverPanel = FALSE;
              hideBar();
            });
          }
        }

        // support for mobile
        if (config.enableTouch)
        {
          me.bind('touchstart', function(e,b){
            if (e.originalEvent.touches.length)
            {
              // record where touch started
              touchDif = e.originalEvent.touches[0].pageY;
            }
          });

          me.bind('touchmove', function(e){
            // prevent scrolling the page
            e.originalEvent.preventDefault();
            if (e.originalEvent.touches.length)
            {
              // see how far user swiped
              var diff = (touchDif - e.originalEvent.touches[0].pageY) / config.touchScrollStep;
              // scroll content
              scrollContent(diff, TRUE);
            }
          });
        }

        function mouseWheelHandler(e)
        {
          // use mouse wheel only when mouse is over
          if (!isOverPanel)
          {
            return;
          }

          var e = e || window.event,
              delta = 0,
              target = e.target || e.srcTarget;

          if (e.wheelDelta)
          {
            delta = -e.wheelDelta/120;
          }
          if (e.detail)
          {
            delta = e.detail / 3;
          }

          if ($(target).closest('.' + config.wrapperClass).is(me.parent())) {
            // scroll content
            scrollContent(delta, TRUE);
          }

          // stop window scroll
          if (e.preventDefault && !releaseScroll)
          {
            e.preventDefault();
          }
          if (!releaseScroll)
          {
            e.returnValue = FALSE;
          }
        }

        function scrollContent(y, isWheel, isJump)
        {
          var delta = y, maxTop = railW.outerHeight() - bar.outerHeight();

          if (isWheel)
          {
            // move bar with mouse wheel
            delta = parseInt(bar.css('top')) + y * parseInt(config.wheelStep) / 100 * railW.outerHeight();

            // move bar, make sure it doesn't go out
            delta = Math.min(Math.max(delta, 0), maxTop);

            // if scrolling down, make sure a fractional change to the
            // scroll position isn't rounded away when the scrollbar's CSS is set
            // this flooring of delta would happened automatically when
            // bar.css is set below, but we floor here for clarity
            delta = (y > 0) ? Math.ceil(delta) : Math.floor(delta);

            // scroll the scrollbar
            bar.css({ top: delta + 'px' });
          }

          // calculate actual scroll amount
          percentScroll = parseInt(bar.css('top')) / maxTop;
          delta = percentScroll * (me[0].scrollHeight - me.outerHeight());

          if (isJump)
          {
            delta = y;
            var offsetTop = delta / me[0].scrollHeight * me.outerHeight();
            offsetTop = Math.min(Math.max(offsetTop, 0), maxTop);
            bar.css({ top: offsetTop + 'px' });
          }

          // scroll content
          me.scrollTop(delta);

          // ensure bar is visible
          showBar();

          // trigger hide when scroll is stopped
          hideBar();
        }

        // attach scroll events
        if (config.enableWheel)
        {
          if (window.addEventListener)
          {
            dom.addEventListener('DOMMouseScroll', mouseWheelHandler, FALSE);
            dom.addEventListener('mousewheel', mouseWheelHandler, FALSE);
          }
          else
          {
            window.document.attachEvent('onmousewheel', mouseWheelHandler);
          }
        }

        function getBarHeight()
        {
          // calculate scrollbar height and make sure it is not too small
          barHeight = Math.max((me.outerHeight() / me[0].scrollHeight) * railW.outerHeight(), minBarHeight);
          bar.css({ height: barHeight + 'px' });
        }

        // set up initial height
        getBarHeight();

        function showBar()
        {
          // clear the timer responsible for hiding the scrollbar
          if (queueHide)
          {
            clearTimeout(queueHide);
            queueHide = NULL;
          }

          // recalculate bar height
          getBarHeight();

          // when bar reached top or bottom
          if (percentScroll === ~~ percentScroll)
          {
            //release wheel
            releaseScroll = config.allowPageScroll;

            // publish approporiate event
            if (lastScroll !== percentScroll)
            {
                me.trigger('slimscroll', (~~percentScroll === 0) ? 'top' : 'bottom');
            }
          }
          lastScroll = percentScroll;

          // show only when required
          if(barHeight >= railW.outerHeight()) {
            //allow window scroll
            releaseScroll = TRUE;
            return;
          }

          if (config.railVisible)
          {
            rail.stop(TRUE, TRUE).fadeIn(config.fadeDelay);
          }
          bar.stop(TRUE, TRUE).fadeIn(config.fadeDelay);

          // show the rail wrapper
          railW.show();
        }

        function hideBar()
        {
          // only hide when options allow it
          if (!config.alwaysVisible && !queueHide)
          {
            queueHide = setTimeout(function() {
              queueHide = NULL;
              if (!(config.disableFadeOut && isOverPanel) && !isOverBar && !isDragg)
              {
                if (config.railVisible)
                {
                  rail.fadeOut(config.fadeDelay);
                }
                bar.fadeOut(config.fadeDelay);
              }
            }, config.hideDelay);
          }
        }

        // check start position
        if (config.start === 'bottom')
        {
          // scroll content to bottom
          bar.css({ top: railW.outerHeight() - bar.outerHeight() });
          scrollContent(0, TRUE);
        }
        else if (typeof config.start === 'object')
        {
          // scroll content
          scrollContent($(config.start).position().top, NULL, TRUE);

          // make sure bar stays hidden
          if (!config.alwaysVisible)
          {
            bar.hide();
          }
        }

        // make sure rail wrapper starts up hidden
        if (!config.alwaysVisible && !config.railVisible)
        {
          railW.hide();
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
