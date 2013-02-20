/*! Copyright (c) 2011 Piotr Rochala (http://rocha.la)
 * Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 * and GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.
 *
 * Version: 1.0.9
 *
 *! Modified and enhanced by Opoint AS (www.opoint.com), (c) 2013
 * - Uses strict JavaScript now
 * - Using three equal signs instead of two
 * - Missing semi colons
 * - Passes in few additional global variables to closure
 * - Uses jQuery variable once, $ otherwise
 * - Normalized document
 *
 * Version: 1.0.9.1
 *
 */

"use strict";

// used in various places, results in better minification
(function($, window, Math, parseInt, TRUE, FALSE, CLS_PREFIX) {

  $.fn.extend({
    slimScroll: function(options) {

      var defaults = {
        wheelStep : 20,
        width : 'auto',
        height : '250px',
        size : '7px',
        color: '#000',
        position : 'right',
        distance : '1px',
        baseline : '1px',
        start : 'top',
        opacity : .4,
        alwaysVisible : FALSE,
        disableFadeOut: FALSE,
        railVisible : FALSE,
        railColor : '#333',
        railOpacity : '0.2',
        railClass : CLS_PREFIX + 'Rail',
        barClass : CLS_PREFIX + 'Bar',
        wrapperClass : CLS_PREFIX + 'Div',
        allowPageScroll : FALSE,
        scroll : 0,
        touchScrollStep : 200
      };

      var o = $.extend(defaults, options);
      o.distance = '30px';
      o.baseline = '30px';
      o.baseline = parseInt(o.baseline);
      o.padding = 2 * o.baseline;

      // do it for every element that matches selector
      this.each(function(){

        var isOverPanel, isOverBar, isDragg, queueHide, touchDif,
            barHeight, percentScroll, lastScroll,
            divS = '<div></div>',
            minBarHeight = 30,
            releaseScroll = FALSE;

        // used in event handlers and for better minification
        var dom = this, me = $(dom);

        // ensure we are not binding it again
        if (me.parent().hasClass(CLS_PREFIX + 'Div'))
        {
            // start from last bar position
            var offset = me.scrollTop();

            // find bar and rail
            bar = me.parent().find('.slimScrollBar');
            rail = me.parent().find('.slimScrollRail');

            getBarHeight();

            // check if we should scroll existing instance
            if (options)
            {
              if ('scrollTo' in options)
              {
                // jump to a static point
                offset = parseInt(o.scrollTo);
              }
              else if ('scrollBy' in options)
              {
                // jump by value pixels
                offset += parseInt(o.scrollBy);
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
              scrollContent(offset, FALSE, TRUE);
            }

            return;
        }

        // optionally set height to the parent's height
        o.height = (o.height === 'auto') ? me.parent().innerHeight() : o.height;

        // wrap content
        var wrapper = $(divS)
          .addClass(o.wrapperClass)
          .css({
            position: 'relative',
            overflow: 'hidden',
            width: o.width,
            height: o.height
          });

        // update style for the div
        me.css({
          overflow: 'hidden',
          width: o.width,
          height: o.height
        });

        // create scrollbar rail
        var rail  = $(divS)
          .addClass(o.railClass)
          .css({
            width: o.size,
//            height: '100%',
            position: 'absolute',
            top: o.baseline + 'px',
            bottom: o.baseline,
            display: (o.alwaysVisible && o.railVisible) ? 'block' : 'none',
            'border-radius': o.size,
            background: o.railColor,
            opacity: o.railOpacity,
            zIndex: 90
          });

        // create scrollbar
        var bar = $(divS)
          .addClass(o.barClass)
          .css({
            background: o.color,
            width: o.size,
            position: 'absolute',
            top: o.baseline + 'px',
            opacity: o.opacity,
            display: o.alwaysVisible ? 'block' : 'none',
            'border-radius' : o.size,
            BorderRadius: o.size,
            MozBorderRadius: o.size,
            WebkitBorderRadius: o.size,
            zIndex: 99
          });

        // set position
        var posCss = (o.position === 'right') ? { right: o.distance } : { left: o.distance };
        rail.css(posCss);
        bar.css(posCss);

        // wrap it
        me.wrap(wrapper);

        // append to parent div
        me.parent().append(bar);
        me.parent().append(rail);

        // make it draggable
        bar.draggable({
          axis: 'y',
          containment: 'parent',
          start: function() { isDragg = TRUE; },
          stop: function() { isDragg = FALSE; hideBar(); },
          drag: function(e)
          {
            // scroll content
            scrollContent(0, $(this).position().top, FALSE);
          }
        });

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

        // support for mobile
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
            var diff = (touchDif - e.originalEvent.touches[0].pageY) / o.touchScrollStep;
            // scroll content
            scrollContent(diff, TRUE);
          }
        });

        function _onWheel(e)
        {
          // use mouse wheel only when mouse is over
          if (!isOverPanel) { return; }

          var e = e || window.event;

          var delta = 0;
          if (e.wheelDelta) { delta = -e.wheelDelta/120; }
          if (e.detail) { delta = e.detail / 3; }

          var target = e.target || e.srcTarget;
          if ($(target).closest('.' + o.wrapperClass).is(me.parent())) {
            // scroll content
            scrollContent(delta, TRUE);
          }

          // stop window scroll
          if (e.preventDefault && !releaseScroll) { e.preventDefault(); }
          if (!releaseScroll) { e.returnValue = FALSE; }
        }

        function scrollContent(y, isWheel, isJump)
        {
          var delta = y;
          var maxTop = me.outerHeight() - bar.outerHeight();

          if (isWheel)
          {
            // move bar with mouse wheel
            delta = parseInt(bar.css('top')) + y * parseInt(o.wheelStep) / 100 * bar.outerHeight();

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
          percentScroll = parseInt(bar.css('top')) / (me.outerHeight() - bar.outerHeight());
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

        function attachWheel()
        {
          if (window.addEventListener)
          {
            dom.addEventListener('DOMMouseScroll', _onWheel, FALSE);
            dom.addEventListener('mousewheel', _onWheel, FALSE);
          }
          else
          {
            window.document.attachEvent("onmousewheel", _onWheel);
          }
        };

        // attach scroll events
        attachWheel();

        function getBarHeight()
        {
          // calculate scrollbar height and make sure it is not too small
          barHeight = Math.max((me.outerHeight() / me[0].scrollHeight) * me.outerHeight(), minBarHeight);
          bar.css({ height: barHeight + 'px' });
        }

        // set up initial height
        getBarHeight();

        function showBar()
        {
          // recalculate bar height
          getBarHeight();
          clearTimeout(queueHide);

          // when bar reached top or bottom
          if (percentScroll === ~~ percentScroll)
          {
            //release wheel
            releaseScroll = o.allowPageScroll;

            // publish approporiate event
            if (lastScroll !== percentScroll)
            {
                var msg = (~~percentScroll === 0) ? 'top' : 'bottom';
                me.trigger('slimscroll', msg);
            }
          }
          lastScroll = percentScroll;

          // show only when required
          if(barHeight >= me.outerHeight()) {
            //allow window scroll
            releaseScroll = TRUE;
            return;
          }
          bar.stop(TRUE, TRUE).fadeIn('fast');
          if (o.railVisible) { rail.stop(TRUE, TRUE).fadeIn('fast'); }
        }

        function hideBar()
        {
          // only hide when options allow it
          if (!o.alwaysVisible)
          {
            queueHide = setTimeout(function(){
              if (!(o.disableFadeOut && isOverPanel) && !isOverBar && !isDragg)
              {
                bar.fadeOut('slow');
                rail.fadeOut('slow');
              }
            }, 1000);
          }
        }

        // check start position
        if (o.start === 'bottom')
        {
          // scroll content to bottom
          bar.css({ top: me.outerHeight() - bar.outerHeight() });
          scrollContent(0, TRUE);
        }
        else if (typeof o.start === 'object')
        {
          // scroll content
          scrollContent($(o.start).position().top, null, TRUE);

          // make sure bar stays hidden
          if (!o.alwaysVisible) { bar.hide(); }
        }
      });

      // maintain chainability
      return this;
    }
  });

  $.fn.extend({
    slimscroll: $.fn.slimScroll
  });

})(jQuery, window, Math, parseInt, !0, !1, 'slimScroll');
