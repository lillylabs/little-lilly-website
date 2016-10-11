angular.module("Backbone", ["firebase"]);

angular.module("Backbone")
  .factory("Auth", ["$firebaseAuth", function ($firebaseAuth) {
    return $firebaseAuth();
  }]);

angular.module("Backbone")
  .factory("Profile", ["$firebaseObject", function ($firebaseObject) {

    var Profile = $firebaseObject.$extend({
      getFullName: function () {
        if (this.name) {
          return this.name.first + " " + this.name.last;
        }
      },
      igToken: function () {
        if (this.ig_accounts) {
          return this.ig_accounts[Object.keys(this.ig_accounts)[0]].token;
        }
      }
    });

    return function (uid) {
      var ref = firebase.database().ref('users/' + uid + '/profile');
      return new Profile(ref);
    }
  }]);

angular.module("Backbone")
  .factory("Letter", ["$firebaseObject", "$firebaseArray", function ($firebaseObject, $firebaseArray) {

    var startMoment = moment().date(1);
    var endMoment = moment().endOf('month');

    var Letter = $firebaseObject.$extend({

      $$defaults: {
        name: startMoment.format("MMMM YYYY"),
        timeframe: {
          start: startMoment.format("YYYY-MM-DD"),
          end: endMoment.format("YYYY-MM-DD")
        }
      },
      getGreeting: function () {
        return $firebaseObject(this.$ref().child('greeting'));
      },
      getRecipients: function () {
        return $firebaseArray(this.$ref().child('recipients'));
      }

    });

    return function (uid) {
      var ref = firebase.database().ref('users/' + uid + '/letter');
      return new Letter(ref);
    }
  }]);

angular.module("Backbone")
  .factory("Users", ["$firebaseArray", function ($firebaseArray) {
    return function (uid) {
      var ref = firebase.database().ref('users');
      return $firebaseArray(ref);
    };
  }]);

angular.module("Backbone")
  .factory("Archive", ["$firebaseArray", function ($firebaseArray) {
    return function (uid) {
      var ref = firebase.database().ref('users/' + uid + '/archive').limitToLast(5);
      return $firebaseArray(ref);
    }
  }]);

angular.module("Backbone")
  .service("URLService", ["$window", "$location", function ($window) {

    function goTo(path) {
      $window.location.assign(path);
    }

    this.goToHome = function () {
      goTo('/');
    };

    this.goToApp = function () {
      goTo('/app');
    };

    this.goToSignIn = function () {
      goTo('/login');
    };

    this.isApp = function () {
      return $window.location.pathname == '/app/';
    }
  }])

angular.module("Backbone")
  .service("DataMigration", ["Profile", "Letter", function (Profile, Letter) {

    function getRecipients(parseUser) {
      var query = new Parse.Query("Recipient");
      query.equalTo("user", parseUser);
      return query.find().then(function (parseRecipients) {
        var recipients = [];
        angular.forEach(parseRecipients, function (parseRecipient) {
          recipients.push({
            name: parseRecipient.get("name"),
            address: parseRecipient.get("address")
          });
        });
        return recipients;
      })
    }

    function getDefaultGreeting(parseUser) {
      var query = new Parse.Query("Greeting");
      query.equalTo("user", parseUser);
      return query.first().then(function (parseGreeting) {
        if (parseGreeting && parseGreeting.get("reusable")) {
          return parseGreeting.get("text");
        } else {
          return null;
        }
      })
    }

    function getCreditBalance(parseUser) {
      var query = new Parse.Query("CreditsBalance");
      query.equalTo("user", parseUser);
      return query.find().then(function (parseCreditBalances) {
        if (parseCreditBalances) {
          var newCredits = parseCreditBalances[0] ? parseCreditBalances[0].get("credits") : 0;
          var oldCredits = parseCreditBalances[1] ? parseCreditBalances[1].get("credits") : 0;
          return newCredits + oldCredits;
        } else {
          return null;
        }
      })
    }

    function getName(parseUser) {
      var query = new Parse.Query("Profile");
      query.equalTo("user", parseUser);
      return query.first().then(function (parseProfile) {
        if (parseProfile) {
          return {
            firstName: parseProfile.get("firstName"),
            lastName: parseProfile.get("lastName")
          };
        } else {
          return null;
        }
      })
    }

    this.getParseUserInfo = function (parseUser) {
      var promises = [];
      promises.push(getRecipients(parseUser));
      promises.push(getDefaultGreeting(parseUser));
      promises.push(getCreditBalance(parseUser));
      promises.push(getName(parseUser));
      return Parse.Promise.when(promises).then(function (parseInfo) {
        return {
          recipients: parseInfo[0],
          greeting: parseInfo[1],
          creditBalance: parseInfo[2],
          name: parseInfo[3]
        }
      });
    }

    this.updateFirebaseUser = function (firebaseUser, userData) {
      return Profile(firebaseUser.uid).$loaded().then(function (profile) {

        if (userData.name) {
          profile.name = {
            first: userData.name.firstName ? userData.name.firstName : "",
            last: userData.name.lastName ? userData.name.lastName : ""
          };
        }

        profile.credits = userData.creditBalance;
        profile.greeting = {
          text: userData.greeting
        }

        return profile.$save();

      }).then(function () {

        return Letter(firebaseUser.uid).$loaded().then(function (letter) {

          letter.greeting = {
            text: userData.greeting
          }
          letter.recipients = userData.recipients;
          return letter.$save();
        })
      }).then(function () {
        return firebaseUser;
      });
    }
  }]);
