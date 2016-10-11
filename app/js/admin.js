angular.module("LittleLillyAdmin", ["firebase", "ui.router", "angularMoment", "Backbone", "Authentication", "IG"]);

angular.module("LittleLillyAdmin")
  .controller("AdminStatusController", ["$scope", "users", function ($scope, users) {

    $scope.users = users;

  }]);

angular.module("LittleLillyAdmin")
  .controller("AdminPdfController", ["$scope", "users", function ($scope, users) {

    $scope.users = users;

  }]);

angular.module("LittleLillyAdmin")
  .controller("AdminLabelsController", ["$scope", "users", function ($scope, users) {

    $scope.users = users;

  }]);
