angular.module("LittleLillyAdmin", ["firebase", "ui.router", "angularMoment", "Backbone", "Authentication", "IG"]);

angular.module("LittleLillyAdmin")
  .controller("AdminStatusController", ["$scope", "users", function ($scope, users) {

    $scope.users = users;

  }]);

angular.module("LittleLillyAdmin")
  .controller("AdminUserStatusController", ["$scope", "Profile", "Letter", "moment", function ($scope, Profile, Letter, moment) {

    var uid = $scope.user.$id;

    $scope.uid = uid;

    $scope.userFullName = "";
    $scope.name = "";
    $scope.timeframe = {
      start: "",
      end: ""
    };
    $scope.recipientCount = 0;
    $scope.greetingText = "";
    $scope.photoCount = 0;

    var letter = Letter(uid);
    var profile = Profile(uid);

    profile.$watch(function() {
      $scope.userFullName = profile.getFullName();
    });

    letter.$watch(function() {
      $scope.name = letter.name;
    });

    letter.$watch(function() {
      $scope.timeframe = letter.timeframe;
    });

    letter.$watch(function() {
      $scope.greetingText = letter.greeting.text;
    });

    letter.$watch(function() {
      if(moment().date() > 15) {
        $scope.postponed = moment(letter.timeframe.end).month() > moment().month();
      } else {
        $scope.postponed = moment(letter.timeframe.end).month() >= moment().month();
      }
    });

    letter.$watch(function() {
      $scope.recipientCount = 0;
      angular.forEach(letter.recipients, function(recipient) {
        $scope.recipientCount++;
      });
    });

    letter.$watch(function() {
      $scope.photoCount = letter.photos.length;
    });

  }]);

angular.module("LittleLillyAdmin")
  .controller("AdminPdfController", ["$scope", "users", function ($scope, users) {

    $scope.users = users;

  }]);

angular.module("LittleLillyAdmin")
  .controller("AdminLabelsController", ["$scope", "users", function ($scope, users) {

    $scope.recipients = [];

    for(var i=0; i < users.length; i++) {
      var user = users[i];
      if(user.letter_in_progress) {
        angular.forEach(user.letter_in_progress.recipients, function(recipient) {
          $scope.recipients.push(recipient);
        });
      }
    }

    var lillylabels = ($scope.recipients.length % 24) + 24;

    for(var i=0; i < lillylabels; i++) {
     $scope.recipients.push({
       name: "Little Lilly",
       address: "co/bGraphic AS \nTromsøgata 26 \n0565 Oslo \nNorway"
     });
    }

  }]);
