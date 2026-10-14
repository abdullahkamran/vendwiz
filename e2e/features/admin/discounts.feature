@admin
Feature: Admin discounts management

  Scenario: Discounts list renders without error
    Given I am on the admin discounts page
    Then the discounts page loads successfully

  Scenario: Admin creates a discount
    Given I am on the new discount page
    When I enter the discount code "E2ETEST10"
    And I select the discount type "percentage"
    And I set the discount value to "10"
    And I submit the discount form
    Then I see the discount code "E2ETEST10" in the discounts list

  Scenario: Admin deletes a discount
    Given I am on the admin discounts page
    When I delete the discount "E2ETEST10"
    Then the discount "E2ETEST10" is not in the discounts list
