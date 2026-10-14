// Generated from: e2e/features/storefront/tracking.feature
import { test } from "../../../../e2e/fixtures/index.ts";

test.describe('Storefront order tracking', () => {

  test('Track page renders an order reference input', async ({ Given, Then, page }) => { 
    await Given('I am on the storefront track page', null, { page }); 
    await Then('I see an order reference input field', null, { page }); 
  });

  test('Submitting a known order reference shows order status', async ({ Given, When, Then, And, page }) => { 
    await Given('I have placed a test order and have its reference', null, { page }); 
    await When('I am on the storefront track page', null, { page }); 
    await And('I submit the test order reference', null, { page }); 
    await Then('I see the order status on the page', null, { page }); 
  });

  test('Submitting unknown reference shows not-found message', async ({ Given, When, Then, page }) => { 
    await Given('I am on the storefront track page', null, { page }); 
    await When('I submit an unknown order reference', null, { page }); 
    await Then('I see an order not found message', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('e2e/features/storefront/tracking.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given I am on the storefront track page","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Outcome","textWithKeyword":"Then I see an order reference input field","stepMatchArguments":[]}]},
  {"pwTestLine":11,"pickleLine":7,"tags":[],"steps":[{"pwStepLine":12,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I have placed a test order and have its reference","stepMatchArguments":[]},{"pwStepLine":13,"gherkinStepLine":9,"keywordType":"Action","textWithKeyword":"When I am on the storefront track page","stepMatchArguments":[]},{"pwStepLine":14,"gherkinStepLine":10,"keywordType":"Action","textWithKeyword":"And I submit the test order reference","stepMatchArguments":[]},{"pwStepLine":15,"gherkinStepLine":11,"keywordType":"Outcome","textWithKeyword":"Then I see the order status on the page","stepMatchArguments":[]}]},
  {"pwTestLine":18,"pickleLine":13,"tags":[],"steps":[{"pwStepLine":19,"gherkinStepLine":14,"keywordType":"Context","textWithKeyword":"Given I am on the storefront track page","stepMatchArguments":[]},{"pwStepLine":20,"gherkinStepLine":15,"keywordType":"Action","textWithKeyword":"When I submit an unknown order reference","stepMatchArguments":[]},{"pwStepLine":21,"gherkinStepLine":16,"keywordType":"Outcome","textWithKeyword":"Then I see an order not found message","stepMatchArguments":[]}]},
]; // bdd-data-end