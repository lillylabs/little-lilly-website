var parse = {
  test: {
    appKey: "GVeUGJvhxfUYrQjiaPWn00MgDx0m9I8178HIvSan",
    javascriptKey: "JnfjqZx3WHsgqNpbIxU3Yp6tHD8TMy3pTSvDFmGo"
  },
  prod: {
    appKey: "JRDFv7WKBItS7VPZ3vC4Iaa7mFkY7FmNdsrImIpr",
    javascriptKey: "HGG0SJ0l9QMtmr7mwa3I97TAZBaY4t67jUtT23IZ"
  }
}

if (window.location.host == 'www.littlelilly.no') {
  console.log("Parse: Lillygram");
  Parse.initialize(parse.prod.appKey, parse.prod.javascriptKey);
} else {
  console.log("Parse: Lillygram Test");
  Parse.initialize(parse.test.appKey, parse.test.javascriptKey);
}
