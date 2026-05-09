window.console =
  window.console ||
  (function () {
    var e = {};
    e.log =
      e.warn =
      e.debug =
      e.info =
      e.error =
      e.time =
      e.dir =
      e.profile =
      e.clear =
      e.exception =
      e.trace =
      e.assert =
        function () {};
    return e;
  })();

$(document).ready(function () {
    var e =

    '<div class="offcanvas offcanvas-end" tabindex="-1" id="offcanvasRight">' +
        '<div class="offcanvas-header">' +
            '<h6 id="offcanvasRightLabel">Setting</h6>' +
            '<button type="button" class="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Close"></button>' +
        '</div>' +
        '<div class="offcanvas-body">' +
            '<div class="widget-tabs">' +
                '<ul class="widget-menu-tab style-1">' +
                    '<li class="item-title active">' +
                        '<span class="inner">' +
                            '<div class="text text-title">Theme Style</div>' +
                        '</span>' +
                    '</li>' +
                    '<li class="item-title">' +
                        '<span class="inner">' +
                            '<div class="text text-title">Theme Colors</div>' +
                        '</span>' +
                    '</li>' +
                '</ul>' +
                '<div class="widget-content-tab">' +
                    '<div class="widget-content-inner active">' +
                        '<form class="form-theme-style">' +
                            '<fieldset class="layout-width">' +
                                '<div class="text mb-5">Layout width style</div>' +
                                '<div class="radio-buttons">' +
                                    '<div class="item">' +
                                        '<input class="full" type="radio" name="width-style" id="width-style1">' +
                                        '<label for="width-style1" class=""><div class="text">Full width</div></label>' +
                                    '</div>' +
                                    '<div class="item">' +
                                        '<input class="boxed" type="radio" name="width-style" id="width-style2" checked="">' +
                                        '<label for="width-style2" class=""><div class="text">Boxed</div></label>' +
                                    '</div>' +
                                '</div>' +
                            '</fieldset>' +
                            '<fieldset class="menu-style">' +
                                '<div class="text mb-5">Vertical & Horizontal menu style</div>' +
                                '<div class="radio-buttons">' +
                                    '<div class="item">' +
                                        '<input class="menu-click" type="radio" name="menu-style" id="menu-style1" checked="">' +
                                        '<label class="" for="menu-style1"><div class="text">Menu click</div></label>' +
                                    '</div>' +
                                    '<div class="item">' +
                                        '<input class="icon-hover" type="radio" name="menu-style" id="menu-style2">' +
                                        '<label class="" for="menu-style2"><div class="text">Icon hover</div></label>' +
                                    '</div>' +
                                    '<div class="item">' +
                                        '<input class="icon-default" type="radio" name="menu-style" id="menu-style3">' +
                                        '<label class="" for="menu-style3"><div class="text">Icon default</div></label>' +
                                    '</div>' +
                                '</div>' +
                            '</fieldset>' +
                            '<fieldset class="menu-position">' +
                                '<div class="text mb-5">Menu position</div>' +
                                '<div class="radio-buttons">' +
                                    '<div class="item">' +
                                        '<input class="menu-fixed" type="radio" name="menu-position" id="menu-position1" checked="">' +
                                        '<label class="" for="menu-position1"><div class="text">Fixed</div></label>' +
                                    '</div>' +
                                    '<div class="item">' +
                                        '<input class="menu-scrollable" type="radio" name="menu-position" id="menu-position2">' +
                                        '<label class="" for="menu-position2"><div class="text">Scrollable</div></label>' +
                                    '</div>' +
                                '</div>' +
                            '</fieldset>' +
                            '<fieldset class="header-position">' +
                                '<div class="text mb-5">Header positions</div>' +
                                '<div class="radio-buttons">' +
                                    '<div class="item">' +
                                        '<input class="header-fixed" type="radio" name="header-positions" id="header-positions1" checked="">' +
                                        '<label class="" for="header-positions1"><div class="text">Fixed</div></label>' +
                                    '</div>' +
                                    '<div class="item">' +
                                        '<input class="header-scrollable" type="radio" name="header-positions" id="header-positions2">' +
                                        '<label class="" for="header-positions2"><div class="text">Scrollable</div></label>' +
                                    '</div>' +
                                '</div>' +
                            '</fieldset>' +
                            '<fieldset class="style-loader">' +
                                '<div class="text mb-5">Loader</div>' +
                                '<div class="radio-buttons">' +
                                    '<div class="item">' +
                                        '<input class="style-loader-on" type="radio" name="loader" id="loader1" checked="">' +
                                        '<label class="" for="loader1"><div class="text">Enable</div></label>' +
                                    '</div>' +
                                    '<div class="item">' +
                                        '<input class="style-loader-off" type="radio" name="loader" id="loader2">' +
                                        '<label class="" for="loader2"><div class="text">Disable</div></label>' +
                                    '</div>' +
                                '</div>' +
                            '</fieldset>' +
                            '<div class="tf-button style-1 label-01 w-100 cursor-pointer w-full button-clear-select">Clear all</div>' +
                        '</form>' +
                    '</div>' +
                    '<div class="widget-content-inner">' +
                        '<form class="form-theme-color">' +
                            '<fieldset class="menu-color">' +
                                '<div class="text mb-10">Menu Background color</div>' +
                                '<div class="select-colors-theme colors-menu mb-10">' +
                                    '<div class="item color-181818 active default"></div>' +
                                    '<div class="item color-1E293B"></div>' +
                                    '<div class="item color-fff"></div>' +
                                    '<div class="item color-3A3043"></div>' +
                                '</div>' +
                            '</fieldset>' +
                            '<fieldset class="">' +
                                '<div class="text mb-10">Header Background color</div>' +
                                '<div class="select-colors-theme colors-header mb-10">' +
                                    '<div class="item color-fff active default"></div>' +
                                    '<div class="item color-1E293B"></div>' +
                                    '<div class="item color-181818"></div>' +
                                    '<div class="item color-3A3043"></div>' +
                                '</div>' +
                            '</fieldset>' +
                            '<fieldset class="">' +
                                '<div class="text mb-10">Theme Primary color</div>' +
                                '<div class="select-colors-theme colors-theme-primary mb-10">' +
                                    '<div class="item color-E43131 active default"></div>' +
                                    '<div class="item color-2377FC"></div>' +
                                    '<div class="item color-35988D"></div>' +
                                    '<div class="item color-7047D6"></div>' +
                                '</div>' +
                            '</fieldset>' +
                            '<fieldset class="">' +
                                '<div class="text mb-10">Theme Background color</div>' +
                                '<div class="select-colors-theme colors-theme-background mb-10">' +
                                    '<div class="item color-F7F7F7 active default"></div>' +
                                    '<div class="item color-252E3A"></div>' +
                                    '<div class="item color-1E1D2A"></div>' +
                                    '<div class="item color-1B2627"></div>' +
                                '</div>' +
                            '</fieldset>' +
                            '<div class="tf-button style-1 label-01 w-100 cursor-pointer w-full button-clear-select">Clear all</div>' +
                        '</form>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>' +
    '</div>';
    
  $("#wrapper").append(e);
});

window.console =
  window.console ||
  (function () {
    var x = {};
    x.log =
      x.warn =
      x.debug =
      x.info =
      x.error =
      x.time =
      x.dir =
      x.profile =
      x.clear =
      x.exception =
      x.trace =
      x.assert =
        function () {};
    return x;
  })();

$(document).ready(function () {
    var x =

    '<div class="setting cursor-pointer" data-bs-toggle="offcanvas" data-bs-target="#offcanvasRight">' +
        '<svg class="icon" width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M9.99222 19.5248C9.43389 19.5248 8.86722 19.3998 8.42555 19.1415L3.84222 16.4998C1.97555 15.2415 1.85889 15.0498 1.85889 13.0748V8.25813C1.85889 6.28313 1.96722 6.09146 3.80055 4.8498L8.41722 2.18313C9.29222 1.6748 10.6672 1.6748 11.5422 2.18313L16.1422 4.83313C18.0089 6.09146 18.1256 6.28313 18.1256 8.25813V13.0665C18.1256 15.0415 18.0172 15.2331 16.1839 16.4748L11.5672 19.1415C11.1172 19.3998 10.5506 19.5248 9.99222 19.5248ZM9.99222 3.05813C9.64222 3.05813 9.30055 3.1248 9.05889 3.26646L4.47555 5.91646C3.11722 6.83313 3.11722 6.83313 3.11722 8.25813V13.0665C3.11722 14.4915 3.11722 14.4915 4.50889 15.4331L9.05889 18.0581C9.55055 18.3415 10.4422 18.3415 10.9339 18.0581L15.5172 15.4081C16.8672 14.4915 16.8672 14.4915 16.8672 13.0665V8.25813C16.8672 6.83313 16.8672 6.83313 15.4756 5.89146L10.9256 3.26646C10.6839 3.1248 10.3422 3.05813 9.99222 3.05813Z" fill="#181818"/>' +
            '<path d="M9.99219 13.7915C8.26719 13.7915 6.86719 12.3915 6.86719 10.6665C6.86719 8.9415 8.26719 7.5415 9.99219 7.5415C11.7172 7.5415 13.1172 8.9415 13.1172 10.6665C13.1172 12.3915 11.7172 13.7915 9.99219 13.7915ZM9.99219 8.7915C8.95885 8.7915 8.11719 9.63317 8.11719 10.6665C8.11719 11.6998 8.95885 12.5415 9.99219 12.5415C11.0255 12.5415 11.8672 11.6998 11.8672 10.6665C11.8672 9.63317 11.0255 8.7915 9.99219 8.7915Z" fill="#181818"/>' +
        '</svg>' +
    '</div>' ;
    
  $(".header-grid").append(x);
});
