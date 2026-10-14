// Generated from: e2e/features/admin/auth.feature
import { test } from "../../../../e2e/fixtures/index.ts";

test.describe('Admin authentication', () => {

  test('Unauthenticated admin redirect', async ({ When, Then, And, page }) => { 
    await When('I visit the admin panel without being logged in', null, { page }); 
    await Then('I am redirected to the login page', null, { page }); 
    await And('the login page has email and password input fields', null, { page }); 
  });

  test('Admin logs in', async ({ Given, When, Then, page }) => { 
    await Given('I am on the login page', null, { page }); 
    await When('I log in with admin credentials', null, { page }); 
    await Then('I land on the admin dashboard', null, { page }); 
  });

  test('Admin logs out', { tag: ['@admin'] }, async ({ Given, When, Then, page }) => { 
    await Given('I am on the admin dashboard', null, { page }); 
    await When('I click the sign out button', null, { page }); 
    await Then('I am redirected to the login page', null, { page }); 
  });

  test('Admin API sign-out clears session', { tag: ['@admin'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I am on the admin dashboard', null, { page }); 
    await When('I sign out via the API', null, { page }); 
    await And('I navigate to the admin panel', null, { page }); 
    await Then('I am redirected to the login page', null, { page }); 
  });

});

// == technical section ==

test.beforeEach('BeforeEach Hooks', ({ $runScenarioHooks, page }) => $runScenarioHooks('before', { page }));

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('e2e/features/admin/auth.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Action","textWithKeyword":"When I visit the admin panel without being logged in","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Outcome","textWithKeyword":"Then I am redirected to the login page","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":6,"keywordType":"Outcome","textWithKeyword":"And the login page has email and password input fields","stepMatchArguments":[]}]},
  {"pwTestLine":12,"pickleLine":8,"tags":[],"steps":[{"pwStepLine":13,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"Given I am on the login page","stepMatchArguments":[]},{"pwStepLine":14,"gherkinStepLine":10,"keywordType":"Action","textWithKeyword":"When I log in with admin credentials","stepMatchArguments":[]},{"pwStepLine":15,"gherkinStepLine":11,"keywordType":"Outcome","textWithKeyword":"Then I land on the admin dashboard","stepMatchArguments":[]}]},
  {"pwTestLine":18,"pickleLine":14,"tags":["@admin"],"steps":[{"pwStepLine":19,"gherkinStepLine":15,"keywordType":"Context","textWithKeyword":"Given I am on the admin dashboard","stepMatchArguments":[]},{"pwStepLine":20,"gherkinStepLine":16,"keywordType":"Action","textWithKeyword":"When I click the sign out button","stepMatchArguments":[]},{"pwStepLine":21,"gherkinStepLine":17,"keywordType":"Outcome","textWithKeyword":"Then I am redirected to the login page","stepMatchArguments":[]}]},
  {"pwTestLine":24,"pickleLine":20,"tags":["@admin"],"steps":[{"pwStepLine":25,"gherkinStepLine":21,"keywordType":"Context","textWithKeyword":"Given I am on the admin dashboard","stepMatchArguments":[]},{"pwStepLine":26,"gherkinStepLine":22,"keywordType":"Action","textWithKeyword":"When I sign out via the API","stepMatchArguments":[]},{"pwStepLine":27,"gherkinStepLine":23,"keywordType":"Action","textWithKeyword":"And I navigate to the admin panel","stepMatchArguments":[]},{"pwStepLine":28,"gherkinStepLine":24,"keywordType":"Outcome","textWithKeyword":"Then I am redirected to the login page","stepMatchArguments":[]}]},
]; // bdd-data-end