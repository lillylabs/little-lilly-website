angular.module("LittleLillyAdmin", ["firebase", "ui.router", "angularMoment", "Backbone", "Authentication", "IG"]);

angular.module("LittleLillyAdmin")
  .controller("AdminStatusController", ["$scope", "users", function ($scope, users) {

    $scope.users = users;

  }]);

angular.module("LittleLillyAdmin")
  .controller("AdminUserStatusController", ["$scope", "Profile", "Letter", function ($scope, Profile, Letter) {

    var uid = $scope.user.$id;
    $scope.profile = Profile(uid);
    $scope.letter = Letter(uid);
    $scope.uid = uid;


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
        $scope.recipients = $scope.recipients.concat(user.letter_in_progress.recipients);
      }
    }


  }]);
