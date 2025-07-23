/**
 * ESLint Rule: no-nan-route
 * 
 * This rule prevents the creation of routes with potentially NaN or undefined values
 * that could result in routes like `/transactions/undefined` or `/transactions/NaN`
 * 
 * @author AI Assistant
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent using potentially undefined or NaN values in route paths',
      category: 'Possible Errors',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
    messages: {
      nanRoute: 'Potential NaN or undefined value in route path. Add validation before using "{{identifier}}" in route.',
      undefinedRoute: 'Variable "{{identifier}}" might be undefined when used in route path. Add validation.',
      objectProperty: 'Object property "{{property}}" might be undefined when used in route path. Use optional chaining and validation.'
    }
  },

  create(context) {
    const sourceCode = context.getSourceCode();
    
    // Track identifiers that are potentially undefined or NaN
    const potentiallyUndefinedIds = new Set();
    
    // Common patterns that suggest a variable might be undefined
    const undefinedPatterns = [
      'selectedTransaction',
      'transaction',
      'customer',
      'item',
      'record',
      'data'
    ];
    
    function isRouteTemplateString(node) {
      if (!node || !node.quasi) return false;
      
      const templateString = sourceCode.getText(node);
      return (
        templateString.includes('/transactions/') ||
        templateString.includes('/customers/') ||
        templateString.includes('/settlements/') ||
        templateString.includes('/api/') ||
        templateString.match(/\/\w+\/\$\{/)
      );
    }
    
    function isRouteStringConcatenation(node) {
      if (node.type !== 'BinaryExpression' || node.operator !== '+') return false;
      
      const leftStr = sourceCode.getText(node.left);
      const rightStr = sourceCode.getText(node.right);
      
      return (
        leftStr.includes('/transactions/') ||
        leftStr.includes('/customers/') ||
        leftStr.includes('/settlements/') ||
        leftStr.includes('/api/') ||
        rightStr.includes('id') ||
        rightStr.includes('Id')
      );
    }
    
    function checkForUnsafeRouteUsage(node, identifier) {
      const identifierName = identifier.name || identifier;
      
      // Check if it's a potentially undefined variable
      if (undefinedPatterns.some(pattern => identifierName.toLowerCase().includes(pattern.toLowerCase()))) {
        context.report({
          node: node,
          messageId: 'undefinedRoute',
          data: { identifier: identifierName },
          fix(fixer) {
            // Suggest adding validation
            const suggestion = `// Add validation: if (!${identifierName} || !${identifierName}.id) return;\n`;
            return fixer.insertTextBefore(node, suggestion);
          }
        });
      }
      
      // Check for numeric IDs that could be NaN
      if (identifierName.toLowerCase().includes('id')) {
        context.report({
          node: node,
          messageId: 'nanRoute',
          data: { identifier: identifierName },
          fix(fixer) {
            const suggestion = `// Add validation: if (!${identifierName} || isNaN(${identifierName}) || ${identifierName} <= 0) return;\n`;
            return fixer.insertTextBefore(node, suggestion);
          }
        });
      }
    }
    
    function checkMemberExpression(node, expression) {
      if (expression.type === 'MemberExpression') {
        const objectName = expression.object.name;
        const propertyName = expression.property.name;
        
        if (propertyName === 'id') {
          context.report({
            node: node,
            messageId: 'objectProperty',
            data: { property: `${objectName}.${propertyName}` },
            fix(fixer) {
              const suggestion = `// Add validation: if (!${objectName} || !${objectName}.${propertyName} || isNaN(${objectName}.${propertyName})) return;\n`;
              return fixer.insertTextBefore(node, suggestion);
            }
          });
        }
      }
    }
    
    return {
      TemplateLiteral(node) {
        if (!isRouteTemplateString(node)) return;
        
        // Check each expression in the template literal
        node.expressions.forEach(expression => {
          if (expression.type === 'Identifier') {
            checkForUnsafeRouteUsage(node, expression);
          } else if (expression.type === 'MemberExpression') {
            checkMemberExpression(node, expression);
          }
        });
      },
      
      BinaryExpression(node) {
        if (!isRouteStringConcatenation(node)) return;
        
        // Check right side of concatenation (usually where the ID goes)
        if (node.right.type === 'Identifier') {
          checkForUnsafeRouteUsage(node, node.right);
        } else if (node.right.type === 'MemberExpression') {
          checkMemberExpression(node, node.right);
        }
      },
      
      // Track potentially undefined variables from function parameters
      FunctionDeclaration(node) {
        if (node.params) {
          node.params.forEach(param => {
            if (param.type === 'Identifier' && undefinedPatterns.some(pattern => 
              param.name.toLowerCase().includes(pattern.toLowerCase()))) {
              potentiallyUndefinedIds.add(param.name);
            }
          });
        }
      },
      
      // Track variables that might be assigned undefined values
      VariableDeclarator(node) {
        if (node.id.type === 'Identifier' && 
            (!node.init || node.init.type === 'Literal' && node.init.value === null)) {
          potentiallyUndefinedIds.add(node.id.name);
        }
      },
      
      // Check useState hooks that might initialize with null/undefined
      CallExpression(node) {
        if (node.callee.name === 'useState' && node.arguments.length > 0) {
          const arg = node.arguments[0];
          if ((arg.type === 'Literal' && arg.value === null) || 
              (arg.type === 'Identifier' && arg.name === 'undefined')) {
            const parent = node.parent;
            if (parent && parent.type === 'VariableDeclarator' && parent.id.type === 'ArrayPattern') {
              parent.id.elements.forEach(element => {
                if (element && element.type === 'Identifier') {
                  potentiallyUndefinedIds.add(element.name);
                }
              });
            }
          }
        }
      }
    };
  }
};
