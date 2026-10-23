@admin
Feature: Admin products management

  Scenario: Products list shows seeded product
    Given I am on the admin products page
    Then I see "E2E Product" in the product list

  Scenario: Admin creates a product
    Given I am on the new product page
    When I enter the product title "E2E Create Test"
    And I enter the product price "100"
    And I enter the product stock "10"
    And I submit the product form
    Then I am on the product edit page
    When I go to the admin products page
    Then I see "E2E Create Test" in the product list

  Scenario: Admin edits a product
    Given I am on the admin products page
    When I click the edit link for the product titled "E2E Create Test"
    And I change the product title to "E2E Edited Product"
    And I submit the product form
    Then the page shows "E2E Edited Product"

  Scenario: Admin deletes a product
    Given I am on the admin products page
    When I delete the product titled "E2E Edited Product"
    Then "E2E Edited Product" is not in the product list
