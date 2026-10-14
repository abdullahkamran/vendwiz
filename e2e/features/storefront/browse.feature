Feature: Storefront browse

  Scenario: Storefront homepage renders without 5xx error
    Given I am on the storefront homepage
    Then the page renders successfully

  Scenario: Products listing shows seeded product
    Given I am on the storefront products page
    Then I see "E2E Product" in the product listing

  Scenario: Search filters results by query
    Given I am on the storefront products page
    When I search for "E2E"
    Then the URL contains "q=E2E"
    And I see "E2E Product" in the product listing

  Scenario: Price sort updates URL with sort param
    Given I am on the storefront products page
    When I sort products by price low to high
    Then the URL contains "sort=price_asc"
