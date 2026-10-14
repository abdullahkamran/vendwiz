@admin
Feature: Admin categories management

  Scenario: Categories list shows seeded category
    Given I am on the admin categories page
    Then I see "E2E Category" in the category list

  Scenario: Admin creates a category
    Given I am on the admin categories page
    When I open the new category modal
    And I enter the category name "E2E New Cat"
    And I save the category
    Then I see "E2E New Cat" in the category list

  Scenario: Admin deletes a category
    Given I am on the admin categories page
    When I delete the category named "E2E New Cat"
    Then "E2E New Cat" is not in the category list
