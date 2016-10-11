(function ($) {
  "use strict"; // Start of use strict

  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      $('.navbar #site-login').attr('href', '/app');
    }
  });

})(jQuery); // End of use strict
