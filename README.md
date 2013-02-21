# What is slimScroll?

slimScroll is a small jQuery plugin that transforms any div into a scrollable area with a nice scrollbar - similar to the one Facebook and Google started using in their products recently. slimScroll doesn't occupy any visual space as it only appears on a user initiated mouse-over. User can drag the scrollbar or use mouse-wheel to change the scroll value.

Demo and more: http://rocha.la/jQuery-slimScroll

Copyright (c) 2011 Piotr Rochala (http://rocha.la)
Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) and GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.

# What has been enhanced in the fork by Opoint?

Taking a look at the source code of both versions, one will see major similarities but also major changes. Quite a lot of moving-things-around has been done, particularly to maximize minification efficiency and to move reusable code out of slimScroll's jQuery implementation and into the main closure. Some syntactical adjustments were made in order to use strict JavaScript.

The following new features have been successfully (through testing) added to slimScroll:

 - Uses strict JavaScript;
 - Using three equal signs instead of two (removes warnings in NetBeans);
 - Passes in few additional global variables to main closure for better minification;
 - Uses jQuery variable once through the main closure and $ otherwise;
 - Normalized DOM's document object;
 - Opt-in to using touch/mouse wheel (touch can be turned off if needed);
 - Set hide/fade delay time;
 - Configurable class name prefix (defaults to 'slimScroll');
 - Support to showing scrollbar when mouse moves while inside target area;
 - Added vertical distance (baseline) support;
 - Added support for glowing border around rail.

# Is this fork backward-compatible with original slimScroll?

In order to simplify the positioning of the rail and scrollbar components, a new DOM structure has been used. This means that this fork is not fully backward-compatible with the original slimScroll, but we believe that the benefits outweigh the drawbacks, by a distance!

**The used DOM structure of the original slimScroll is like this**:

    <div class="slimScrollDiv">
      <!-- original DOM element appears here -->
      <div class="slimScrollBar"><!-- slimScroll's scrollbar element is here --></div>
      <div class="slimScrollRail"><!-- slimScroll's rail element is here --></div>
    </div>

**The new DOM structure in this fork is like this**:

    <div class="slimScrollDiv">
      <!-- original DOM element appears here -->
      <div class="slimScrollRailDiv">
        <div class="slimScrollBar"><!-- slimScroll's scrollbar element is here --></div>
        <div class="slimScrollRail"><!-- slimScroll's rail element is here --></div>
      </div>
    </div>

As you can see, a new DOM element has been added which wraps both the rail and the scrollbar. This simplified a lot of calculations and CSS, and made adding a vertical padding an easy job).

Copyright (c) 2013 Opoint AS (http://www.opoint.com)
Retains the same original license restrictions as original slimScroll
