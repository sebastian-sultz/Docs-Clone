// backend/utils/operationalTransform.js
class OperationalTransform {
  static transform(operation1, operation2) {
    // Basic implementation of operational transform
    // This would need to be expanded based on your specific needs
    const transformedOp = [...operation1];
    
    for (let i = 0; i < operation2.length; i++) {
      const op2 = operation2[i];
      
      if (op2.type === 'insert') {
        // Adjust indices based on previous operations
        for (let j = 0; j < transformedOp.length; j++) {
          const op1 = transformedOp[j];
          if (op1.index >= op2.index && op1.type === 'insert') {
            op1.index += op2.text.length;
          }
        }
      } else if (op2.type === 'delete') {
        // Handle delete operations
        for (let j = 0; j < transformedOp.length; j++) {
          const op1 = transformedOp[j];
          if (op1.index >= op2.index) {
            op1.index = Math.max(op2.index, op1.index - op2.length);
          }
        }
      }
    }
    
    return transformedOp;
  }
}

module.exports = OperationalTransform;