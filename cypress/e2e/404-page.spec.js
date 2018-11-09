describe('404 Page', () => {
  beforeEach(() => {
    cy.visit('/404/').injectAxe();
  });

  it('has no detectable a11y violations', () => {
    // wait for the content to ensure the app has been rendered
    cy.get('html[lang="en"]')
      .getByText('404')
      .checkA11y();
  });

  it('contains 404', () => {
    cy.get('main').within(() => {
      cy.getByText('404').should('exist');
    });
  });

  it('contains a back link', () => {
    cy.get('main').within(() => {
      cy.getByText(/back/i).should('exist');
    });
  });
});
