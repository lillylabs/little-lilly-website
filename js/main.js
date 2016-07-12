/*!
 * Creative v1.0.4 (http://startbootstrap.com/template-overviews/creative)
 * Copyright 2013-2016 Start Bootstrap
 * Licensed under MIT (https://github.com/BlackrockDigital/startbootstrap/blob/gh-pages/LICENSE)
 */

(function($) {
    "use strict"; // Start of use strict

    // Form validation
    $('form').each(function() {
        $(this).validate();
    });

    // Fit Text Plugin for Main Header
    $(".hero h1").fitText(
        1.2, {
            minFontSize: '35px',
            maxFontSize: '65px'
        }
    );

    //jQuery to collapse the navbar on scroll
    $(window).scroll(function() {
        if ($("#mainNav").offset().top > 50) {
            $("#mainNav").addClass("scrolled");
        } else {
            $("#mainNav").removeClass("scrolled");
        }
    });

    // jQuery for page scrolling feature - requires jQuery Easing plugin
    $('a[href^="#"]').bind('click', function(event) {
        var $anchor = $(this);
        $('html, body').stop().animate({
            scrollTop: ($($anchor.attr('href')).offset().top)
        }, 1250, 'easeInOutExpo');
        event.preventDefault();
    });

    // Initialize and Configure Scroll Reveal Animation
    window.sr = ScrollReveal();
    sr.reveal('.blurbs i', {
        duration: 400,
        scale: 0.6,
        distance: '0px'
    }, 200);
    //  sr.reveal('.sr-button', {
    //    duration: 1000,
    //    delay: 200
    //  });
    //  sr.reveal('.sr-contact', {
    //    duration: 600,
    //    scale: 0.3,
    //    distance: '0px'
    //  }, 300);

    //  // Highlight the top nav as scrolling occurs
    //  $('body').scrollspy({
    //    target: '.navbar-fixed-top',
    //    offset: 51
    //  })

    //  // Closes the Responsive Menu on Menu Item Click
    //  $('.navbar-collapse ul li a:not(.dropdown-toggle)').click(function () {
    //    $('.navbar-toggle:visible').click();
    //  });

    // **NOTE** KEEP IN MIND THEY REMOVED THE AFFIX PLUGIN IN BS4 SO IF YOU WANT 
    // TO SET AN OFFSET FOR THE FIXED TOP NAV YOU'LL NEED TO USE SOMETHING ELSE!!

    //  // Offset for Main Navigation
    //  $('#mainNav').affix({
    //    offset: {
    //      top: 100
    //    }
    //  })

    // Initialize and Configure Magnific Popup Lightbox Plugin
     $('.gallery').magnificPopup({
       delegate: 'a',
       type: 'image',
       tLoading: 'Loading image #%curr%...',
       mainClass: 'mfp-img-mobile',
       gallery: {
         enabled: true,
         navigateByImgClick: true,
         preload: [0, 1] // Will preload 0 - before current, and 1 after the current image
       },
       image: {
         tError: '<a href="%url%">The image #%curr%</a> could not be loaded.'
       }
     });

})(jQuery); // End of use strict
