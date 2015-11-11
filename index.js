(function() {
  "use strict";

  var fs = require('fs');
  var request = require('request');
  var cheerio = require('cheerio');
  var _ = require('lodash');
  var settings = require('settings.json');

  // remember cookies
  request = request.defaults({
    jar: true
  });

  function login() {
    console.log('Logging in...');
    request.post('https://www.sct-joseph.skoleintra.dk/Infoweb/Fi2/Login.asp?Redirect=', {
      form: {
        fBrugernavn: settings.username,
        fAdgangskode: settings.password,
        B1: 'Login'
      }
    }, function(error, response, body) {
      if (error) {
        console.log(error);
        throw error;
      }

      console.log(response.statusCode);

      getInbox();
    });
  }

  function loginMobile() {
    console.log('Logging in mobile...');

    console.log('Doing get request to login page');
    request.get('https://sct-joseph.m.skoleintra.dk/Account/IdpLogin', function(error, response, body) {
      if (error) {
        console.log(error);
        throw error;
      }

      if (response.statusCode !== 200) {
        console.log(response.statusCode);
        console.log(body);
        throw 'ERROR: Could not do get request to login page';
      }

      console.log('Doing post request to login page');
      request.post('https://sct-joseph.m.skoleintra.dk/Account/IdpLogin', {
        form: {
          'RoleType': 'Parent',
          'UserName': settings.username,
          'Password': settings.password,
          '__RequestVerificationToken': '-9MIPC9D9my5oKIwqZFLbCgMZfkSTxhFeEThSKlAjEI9tPgNhL9C2a2DAAtJsa6i0zAHnX28hcM0E9eo9Z6XZ1i8hEc1'
        }
      }, function(error, response, body) {
        if (error) {
          console.log(error);
          throw error;
        }

        if (response.statusCode !== 200) {
          console.log(response.statusCode);
          console.log(body);
          return;
        }

        console.log(response.statusCode);
      });
    });
  }

  function getInbox() {
    console.log('Getting inbox...');
    request.get('https://www.sct-joseph.skoleintra.dk/Infoweb/Fi/Besked/Oversigt.asp?Bakke=ind', function(error, response, body) {
      if (error) {
        console.log(error);
        throw error;
      }

      console.log(response.statusCode);

      parseInboxBody(response.body);
    });
  }

  function parseInboxBody(body) {
    console.log('Parsing inbox body');

    let $ = cheerio.load(body);

    let messageRows = $('table:nth-of-type(5) table tr.linje1, table:nth-of-type(5) table tr.linje2');

    _.forEach(messageRows, function(row){

      // Extract message data
      let data = {
        to: 'Alexander',
        title: $(row).find('td:nth-of-type(4)').text().trim(),
        date: $(row).find('td:nth-of-type(5)').text().trim(),
        from: $(row).find('td:nth-of-type(6)').text().replace('\n', '').trim(),
      };

      // Get message link to get the rest of the message data
      let messageLink = $(row).find('td:nth-of-type(4) a')[0];
      let messageUrl = messageLink.attribs.href;

      // Parse the message url
      parseMessageUrl(messageUrl, data);
    });
  }

  function parseMessageUrl(url, data) {
    var fullUrl = 'https://www.sct-joseph.skoleintra.dk/Infoweb/Fi/Besked/' + url;
    console.log('Parsing message url: ' + fullUrl);

    request.get(fullUrl, function(error, response, body) {
      if (error) {
        console.log(error);
        throw error;
      }

      parseMessageBody(body, data);
    });
  }

  function parseMessageBody(body, data) {
    console.log('Parsing message body');

    let $ = cheerio.load(body);

    let hr = $('hr:nth-child(2)');
    let table = hr.next();
    let td = $('td', table); console.info('td', td.text());
    data.message = td.first().html();

    console.info('data', data);
  }


  // Run
  //login();
  // loginMobile(); // Doesn't work yet

  // Test inbox parsing
  // fs.readFile('./test/inbox-body.html', function(err, data) {
  //   parseInboxBody(data);
  // });

    //Test message body parsing
    fs.readFile('./test/message-body.html', function(err, data) {
      parseMessageBody(data, {});
    });
}());
