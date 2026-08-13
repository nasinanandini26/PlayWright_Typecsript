@inventory
Feature: SauceDemo Inventory Management
  As a logged-in SauceDemo user
  I want to sort and manage products in my cart
  So that I can find and purchase the items I want

  Background:
    Given I am logged in as "standard_user"

  @TC_006 @smoke
  Scenario: TC_006 - Add a single product to the cart
    When I add "Sauce Labs Backpack" to the cart
    Then the cart badge should show "1" item

  @TC_007
  Scenario: TC_007 - Remove a product from the cart
    Given I have added "Sauce Labs Backpack" to the cart
    When I remove "Sauce Labs Backpack" from the cart
    Then the cart badge should show "0" items

  @TC_008
  Scenario: TC_008 - Sort products by price, low to high
    When I sort products by "Price (low to high)"
    Then the products should be sorted by price in ascending order
