// Generated from: e2e/features/storefront/checkout.feature
import { test } from "../../../../e2e/fixtures/index.ts";

test.describe('Storefront checkout', () => {

  test('Checkout form shows contact and shipping fields', async ({ Given, When, Then, page }) => { 
    await Given('I have "E2E Product" in my cart', null, { page }); 
    await When('I navigate to the checkout page', null, { page }); 
    await Then('I see fields for name, phone, email, and address', null, { page }); 
  });

  test('Valid checkout submission redirects to confirmation with ref', async ({ Given, When, Then, And, page }) => { 
    await Given('I have "E2E Product" in my cart', null, { page }); 
    await When('I complete the checkout with valid details', null, { page }); 
    await Then('I am on the confirmation page with a ref parameter', null, { page }); 
    await And('the confirmation page shows the order reference', null, { page }); 
  });

  test('Checkout with empty cart redirects away', async ({ Given, When, Then, page }) => { 
    await Given('my cart is empty', null, { page }); 
    await When('I navigate to the checkout page', null, { page }); 
    await Then('I am redirected away from checkout', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('e2e/features/storefront/checkout.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given I have \"E2E Product\" in my cart","stepMatchArguments":[{"group":{"start":7,"value":"\"E2E Product\"","children":[{"start":8,"value":"E2E Product","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Action","textWithKeyword":"When I navigate to the checkout page","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":6,"keywordType":"Outcome","textWithKeyword":"Then I see fields for name, phone, email, and address","stepMatchArguments":[]}]},
  {"pwTestLine":12,"pickleLine":8,"tags":[],"steps":[{"pwStepLine":13,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"Given I have \"E2E Product\" in my cart","stepMatchArguments":[{"group":{"start":7,"value":"\"E2E Product\"","children":[{"start":8,"value":"E2E Product","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":10,"keywordType":"Action","textWithKeyword":"When I complete the checkout with valid details","stepMatchArguments":[]},{"pwStepLine":15,"gherkinStepLine":11,"keywordType":"Outcome","textWithKeyword":"Then I am on the confirmation page with a ref parameter","stepMatchArguments":[]},{"pwStepLine":16,"gherkinStepLine":12,"keywordType":"Outcome","textWithKeyword":"And the confirmation page shows the order reference","stepMatchArguments":[]}]},
  {"pwTestLine":19,"pickleLine":14,"tags":[],"steps":[{"pwStepLine":20,"gherkinStepLine":15,"keywordType":"Context","textWithKeyword":"Given my cart is empty","stepMatchArguments":[]},{"pwStepLine":21,"gherkinStepLine":16,"keywordType":"Action","textWithKeyword":"When I navigate to the checkout page","stepMatchArguments":[]},{"pwStepLine":22,"gherkinStepLine":17,"keywordType":"Outcome","textWithKeyword":"Then I am redirected away from checkout","stepMatchArguments":[]}]},
]; // bdd-data-end