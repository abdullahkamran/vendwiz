Feature: Storefront product detail page

  Scenario: E2E Product detail page shows title and add-to-cart button
    Given I am on the E2E Product detail page
    Then the page heading contains "E2E Product"
    And I see an add-to-cart button
