@api
Feature: JSONPlaceholder REST API
  As a developer using this framework
  I want to exercise a REST API through the shared ApiActions layer
  So that API behaviour is covered alongside the UI, using the same
  config-driven base URL (api.base.url)

  @TC_API_001 @smoke
  Scenario: TC_API_001 - Fetch a single user
    When I send a GET request to "/users/1"
    Then the API response status should be 200
    And the API response JSON field "username" should equal "Bret"

  @TC_API_002
  Scenario: TC_API_002 - Filter comments by query parameter
    When I send a GET request to "/comments" with query parameter "postId" set to "1"
    Then the API response status should be 200
    And the API response JSON array should have 5 items

  @TC_API_003
  Scenario: TC_API_003 - Create a new post
    When I send a POST request to "/posts" with body:
      """
      { "title": "foo", "body": "bar", "userId": 1 }
      """
    Then the API response status should be 201
    And the API response JSON field "title" should equal "foo"
