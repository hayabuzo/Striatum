# Striatum (p5js/webgl)
Script-based realtime shader processor for camera.

Striatum is the next version of [Disaurde](https://github.com/hayabuzo/Disaurde), it allows to create complex and customizable filters with improved performance.

🚀 [Run at GitHub](https://hayabuzo.github.io/Striatum/)

🏓 [Run at OpenProcessing](https://openprocessing.org/sketch/1447131)

🖼 [View Image Gallery](https://www.behance.net/disaurde)

## Shooting mode.

The word at the top of the window is the name of the current filter. Clicking on it leads to the filter creation menu.

**PLAY / PAUSE** - stop and start the filter, upper left corner shows the speed of processing (number of frames per second).

**SAVE** - save the current frame to a separate file (the resolution is shown in the lower right corner), holding the button saves several frames in burst mode.

**HIDE / SHOW** - hide and show the control buttons.

**S** - settings menu.

**P** - playing mode.

**V** - hide and show image on screen.

**↑ / →** - vertical or horizontal image orientation for saving.

**1, 2, 3**  - finely tune of 6 variables: _x1, y1, x2, y2, x3, y3_.

**A, B, C** - randomly set of 9 variables: _a1, a2, a3, b1, b2, b3, c1, c2, c3_.

## Settings menu.

**VGA MODE** - sets camera resolution to 640x480.

**QUALITY** - pixel density.

**CAMERA TYPE** - the mail or frontal camera of the device.

**FILE TYPE** - jpg or png file type.

**SAVING DELAY** - used to progressively save a series of photos.

**✓** - apply the selected settings and restart the program.

**X** - exit from the menu while saving the previous settings.

## Filters building.

Every filter should have the special structure with 5 necessary colons:

**FilterName @ TX : UV : CL : AL : BL : TX**

@ - create the first shader

1. TX, input image functions
2. UV, coordinate system functions
3. CL, color functions
4. AL, aplha channel functions
5. BL, blending functions
6. TX, output image functions

'#' - create the next shader (optional)

Functions of same type could be combined between colons with "-" symbol.

Processing goes from left to right of string.

Variables _x1, y1, x2, y2, x3, y3, a1, a2, a3, b1, b2, b3, c1, c2, c3, r1, r2, r3_ are allowed. R-variables are randoms.

Example:
```
Lufibi_Blue                                       <- filter name
@imb::rpi(b1,b2)-neg::dfr(a1):imi                 <- first shader
#imo:dpc(0.9):::nml(0.65):imt                     <- second shader
#::::bi2(0.5):imi                                 <- third shader
```

**Functions** - list of all available functions and arguments.

**Save / Load** - memory and files operations.

**New** - create new filter.

**Reset Variables** - set all A, B, C, X, Y variables to their default values.

**Convert Variables** - replace all A, B, C, X, Y variables in code with their actual values.
