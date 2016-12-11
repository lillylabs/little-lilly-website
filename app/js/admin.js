angular.module("LittleLillyAdmin", ["firebase", "ui.router", "angularMoment", "Backbone", "Authentication", "IG"]);

angular.module("LittleLillyAdmin")
  .controller("AdminStatusController", ["$scope", "users", function ($scope, users) {

    $scope.users = users;

  }]);

angular.module("LittleLillyAdmin")
  .controller("AdminUserStatusController", ["$scope", "Profile", "Letter", "moment", function ($scope, Profile, Letter, moment) {

    var uid = $scope.user.$id;

    $scope.uid = uid;

    $scope.fullName = "";
    $scope.recipientCount = 0;
    $scope.greetingText = "";
    $scope.photoCount = 0;

    $scope.letter = Letter(uid);

    Profile(uid).$loaded().then(function(letter) {
      $scope.fullName = letter.getFullName();
    });

    Letter(uid).$loaded().then(function(letter) {
      $scope.greetingText = letter.greeting.text;

      if(moment().date() > 15) {
        $scope.postponed = moment(letter.timeframe.end).month() > moment().month();
      } else {
        $scope.postponed = moment(letter.timeframe.end).month() >= moment().month();
      }
    });

    Letter(uid).$loaded().then(function(letter) {
      $scope.recipientCount = 0;
      angular.forEach(letter.recipients, function(recipient) {
        $scope.recipientCount++;
      });
    });

    Letter(uid).$loaded().then(function(letter) {
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
