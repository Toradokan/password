import colorString from 'color-string';
import { colors, labels } from '../../src/legend';
import { classifyCharacters } from '../../src/utils';

function colorToRGB(cssColor: string): string {
  return colorString.to.rgb(colorString.get.rgb(cssColor) || []);
}

describe('Index Page', () => {
  const EXPOSURE_ROUTE = 'https://api.pwnedpasswords.com/range/*';

  beforeEach(() => {
    cy.visit('/').injectAxe();
  });

  it('has no detectable a11y violations on load', () => {
    // wait for the content to ensure the app has been rendered
    cy.get('html[lang="en"]');
    cy.findByLabelText('Password').checkA11y();
    cy.findByRole('img', { name: /toggle dark/i })
      .click()
      .checkA11y();
  });

  it('has no detectable a11y violations when showing results', () => {
    cy.intercept('GET', EXPOSURE_ROUTE, {
      fixture: 'exposed-password-response.txt',
    });

    cy.fixture('exposed-password.txt').then((exposedPassword) => {
      cy.findByLabelText('Password').click().type(exposedPassword);
      cy.findByTestId('results').should('exist');
      cy.findByText(/Uh-oh/i).checkA11y();
      cy.findByRole('img', { name: /toggle dark/i })
        .click()
        .checkA11y();
    });
  });

  it('only shows results section with input', () => {
    cy.intercept('GET', EXPOSURE_ROUTE, { statusCode: 418 });

    cy.findByLabelText('Password').should('be.empty');
    cy.findByTestId('results', { timeout: 500 }).should('not.exist');

    cy.findByLabelText('Password').click().type('password');

    cy.findByTestId('results').should('exist');
  });

  it('includes link to source', () => {
    cy.findByRole('img', { name: /view source/i }).should('exist');
  });

  describe('Password Through Lense', () => {
    it('contains classified characters matching the input', () => {
      cy.intercept('GET', EXPOSURE_ROUTE, { statusCode: 418 });

      const password = ' P4ssw0rd! ';
      const classifiedCharacters = classifyCharacters(password, colors, labels);

      cy.findByLabelText('Password').click().type(password);

      cy.findByTestId('password-through-lense')
        // eslint-disable-next-line testing-library/no-node-access
        .children()
        .should('have.length', password.length);

      cy.findByTestId('password-through-lense').within(() => {
        classifiedCharacters.forEach(({ character, color, label }) => {
          cy.findAllByText(character, {
            trim: false,
            collapseWhitespace: false,
          })
            .should('have.css', 'color', colorToRGB(color))
            .and('have.attr', 'title', label);
        });
      });
    });
  });

  describe('Legend', () => {
    beforeEach(() => {
      cy.intercept('GET', EXPOSURE_ROUTE, { statusCode: 418 });

      cy.findByLabelText('Password').click().type('P4ssw0rd!');
    });

    it('exists in results section', () => {
      cy.findByTestId('results').should('exist');
    });

    it('is accurate', () => {
      cy.findByTestId('results').within(() => {
        cy.findByTestId('legend').within(() => {
          // Number
          cy.findByTestId(`legend-row--${labels.number}`).within(() => {
            cy.findByTestId('color').should(
              'have.css',
              'background-color',
              colorToRGB(colors.number),
            );
            cy.findByText(labels.number).should('exist');
          });
          // Uppercase Letter
          cy.findByTestId(`legend-row--${labels.uppercase}`).within(() => {
            cy.findByTestId('color').should(
              'have.css',
              'background-color',
              colorToRGB(colors.uppercase),
            );
            cy.findByText(labels.uppercase).should('exist');
          });
          // Lowercase Letter
          cy.findByTestId(`legend-row--${labels.lowercase}`).within(() => {
            cy.findByTestId('color').should(
              'have.css',
              'background-color',
              colorToRGB(colors.lowercase),
            );
            cy.findByText(labels.lowercase).should('exist');
          });
          // Special
          cy.findByTestId(`legend-row--${labels.special}`).within(() => {
            cy.findByTestId('color').should(
              'have.css',
              'background-color',
              colorToRGB(colors.special),
            );
            cy.findByText(labels.special).should('exist');
          });
        });
      });
    });
  });

  describe('Public Exposure', () => {
    it('shows loading state', () => {
      cy.intercept('GET', EXPOSURE_ROUTE, {
        // delayMs must be longer than PwnedInfo's delayLoadingMs prop value
        delayMs: 1000,
        statusCode: 418,
      });

      cy.findByLabelText('Password').click().type('P4ssw0rd!');

      cy.findByTestId('results').within(() => {
        cy.findByTestId('pwned-info').within(() => {
          cy.findByText(/Loading/).should('exist');
        });
      });
    });

    it('shows positive feedback for clean passwords', () => {
      cy.fixture('clean-password.txt').then((cleanPassword) => {
        cy.intercept('GET', EXPOSURE_ROUTE, {
          fixture: 'clean-password-response.txt',
        });

        cy.findByLabelText('Password').click().type(cleanPassword);

        cy.findByTestId('results').within(() => {
          cy.findByText(/Congratulations/).should('exist');
        });
      });
    });

    it('shows cautionary feedback for exposed passwords', () => {
      cy.fixture('exposed-password.txt').then((exposedPassword) => {
        cy.fixture('exposed-password-count.txt').then(
          (exposedPasswordCount) => {
            cy.intercept('GET', EXPOSURE_ROUTE, {
              fixture: 'exposed-password-response.txt',
            });

            cy.findByLabelText('Password').click().type(exposedPassword);

            cy.findByTestId('results').within(() => {
              cy.findByText(/Uh-oh/).should('exist');
              cy.findByText(exposedPasswordCount.trim()).should('exist');
            });
          },
        );
      });
    });

    it('indicates when public exposure information is unavailable', () => {
      cy.intercept('GET', EXPOSURE_ROUTE, {
        statusCode: 500,
        body: 'API Unavailable',
      });

      cy.findByLabelText('Password').click().type('P4ssw0rd!');

      cy.findByTestId('results').within(() => {
        cy.findByText(/unavailable/).should('exist');
      });
    });
  });
});
