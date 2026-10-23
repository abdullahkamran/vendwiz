// Generated from: e2e/features/storefront/auth.feature
import { test } from "../../../../e2e/fixtures/index.ts";

test.describe('Storefront customer authentication', () => {

  test('Register page renders name, email, and password fields', async ({ Given, Then, page }) => { 
    await Given('I am on the registration page', null, { page }); 
    await Then('I see input fields for name, email, and password', null, { page }); 
  });

  test('Registering with a unique email succeeds', async ({ Given, When, Then, page }) => { 
    await Given('I am on the registration page', null, { page }); 
    await When('I register with a unique customer email and password', null, { page }); 
    await Then('I am on an authenticated page after registration', null, { page }); 
  });

  test('Customer logout navigates to login', async ({ Given, When, Then, page }) => { 
    await Given('I have registered and am logged in as a customer', null, { page }); 
    await When('I sign out as a customer', null, { page }); 
    await Then('the current page is the login page', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('e2e/features/storefront/auth.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given I am on the registration page","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Outcome","textWithKeyword":"Then I see input fields for name, email, and password","stepMatchArguments":[]}]},
  {"pwTestLine":11,"pickleLine":7,"tags":[],"steps":[{"pwStepLine":12,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I am on the registration page","stepMatchArguments":[]},{"pwStepLine":13,"gherkinStepLine":9,"keywordType":"Action","textWithKeyword":"When I register with a unique customer email and password","stepMatchArguments":[]},{"pwStepLine":14,"gherkinStepLine":10,"keywordType":"Outcome","textWithKeyword":"Then I am on an authenticated page after registration","stepMatchArguments":[]}]},
  {"pwTestLine":17,"pickleLine":12,"tags":[],"steps":[{"pwStepLine":18,"gherkinStepLine":13,"keywordType":"Context","textWithKeyword":"Given I have registered and am logged in as a customer","stepMatchArguments":[]},{"pwStepLine":19,"gherkinStepLine":14,"keywordType":"Action","textWithKeyword":"When I sign out as a customer","stepMatchArguments":[]},{"pwStepLine":20,"gherkinStepLine":15,"keywordType":"Outcome","textWithKeyword":"Then the current page is the login page","stepMatchArguments":[]}]},
]; // bdd-data-end