// Generated from: e2e/features/storefront/browse.feature
import { test } from "../../../../e2e/fixtures/index.ts";

test.describe('Storefront browse', () => {

  test('Storefront homepage renders without 5xx error', async ({ Given, Then, page }) => { 
    await Given('I am on the storefront homepage', null, { page }); 
    await Then('the page renders successfully', null, { page }); 
  });

  test('Products listing shows seeded product', async ({ Given, Then, page }) => { 
    await Given('I am on the storefront products page', null, { page }); 
    await Then('I see "E2E Product" in the product listing', null, { page }); 
  });

  test('Search filters results by query', async ({ Given, When, Then, And, page }) => { 
    await Given('I am on the storefront products page', null, { page }); 
    await When('I search for "E2E"', null, { page }); 
    await Then('the URL contains "q=E2E"', null, { page }); 
    await And('I see "E2E Product" in the product listing', null, { page }); 
  });

  test('Price sort updates URL with sort param', async ({ Given, When, Then, page }) => { 
    await Given('I am on the storefront products page', null, { page }); 
    await When('I sort products by price low to high', null, { page }); 
    await Then('the URL contains "sort=price_asc"', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('e2e/features/storefront/browse.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given I am on the storefront homepage","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Outcome","textWithKeyword":"Then the page renders successfully","stepMatchArguments":[]}]},
  {"pwTestLine":11,"pickleLine":7,"tags":[],"steps":[{"pwStepLine":12,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I am on the storefront products page","stepMatchArguments":[]},{"pwStepLine":13,"gherkinStepLine":9,"keywordType":"Outcome","textWithKeyword":"Then I see \"E2E Product\" in the product listing","stepMatchArguments":[{"group":{"start":6,"value":"\"E2E Product\"","children":[{"start":7,"value":"E2E Product","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":16,"pickleLine":11,"tags":[],"steps":[{"pwStepLine":17,"gherkinStepLine":12,"keywordType":"Context","textWithKeyword":"Given I am on the storefront products page","stepMatchArguments":[]},{"pwStepLine":18,"gherkinStepLine":13,"keywordType":"Action","textWithKeyword":"When I search for \"E2E\"","stepMatchArguments":[{"group":{"start":13,"value":"\"E2E\"","children":[{"start":14,"value":"E2E","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":19,"gherkinStepLine":14,"keywordType":"Outcome","textWithKeyword":"Then the URL contains \"q=E2E\"","stepMatchArguments":[{"group":{"start":17,"value":"\"q=E2E\"","children":[{"start":18,"value":"q=E2E","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":20,"gherkinStepLine":15,"keywordType":"Outcome","textWithKeyword":"And I see \"E2E Product\" in the product listing","stepMatchArguments":[{"group":{"start":6,"value":"\"E2E Product\"","children":[{"start":7,"value":"E2E Product","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":23,"pickleLine":17,"tags":[],"steps":[{"pwStepLine":24,"gherkinStepLine":18,"keywordType":"Context","textWithKeyword":"Given I am on the storefront products page","stepMatchArguments":[]},{"pwStepLine":25,"gherkinStepLine":19,"keywordType":"Action","textWithKeyword":"When I sort products by price low to high","stepMatchArguments":[]},{"pwStepLine":26,"gherkinStepLine":20,"keywordType":"Outcome","textWithKeyword":"Then the URL contains \"sort=price_asc\"","stepMatchArguments":[{"group":{"start":17,"value":"\"sort=price_asc\"","children":[{"start":18,"value":"sort=price_asc","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end