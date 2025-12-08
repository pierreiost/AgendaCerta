// frontend/src/components/MaskedInput.js

import React from 'react';

const MaskedInput = ({ 
  type = 'text', 
  mask = 'none',
  value, 
  onChange, 
  ...props 
}) => {
  
  const applyMask = (inputValue, maskType) => {
    // Remove tudo que não é número
    const numbers = inputValue.replace(/\D/g, '');
    
    switch (maskType) {
      case 'cpf':
        // Formato: XXX.XXX.XXX-XX
        if (numbers.length <= 11) {
          return numbers
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        }
        return value;
        
      case 'cnpj':
        // Formato: XX.XXX.XXX/XXXX-XX
        if (numbers.length <= 14) {
          return numbers
            .replace(/(\d{2})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1/$2')
            .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
        }
        return value;
        
      case 'phone':
        // Formato: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
        if (numbers.length <= 11) {
          if (numbers.length <= 10) {
            // Fixo: (XX) XXXX-XXXX
            return numbers
              .replace(/(\d{2})(\d)/, '($1) $2')
              .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
          } else {
            // Celular: (XX) XXXXX-XXXX
            return numbers
              .replace(/(\d{2})(\d)/, '($1) $2')
              .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
          }
        }
        return value;
        
      case 'cep':
        // Formato: XXXXX-XXX
        if (numbers.length <= 8) {
          return numbers.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
        }
        return value;
        
      default:
        return inputValue;
    }
  };
  
  const handleChange = (e) => {
    const maskedValue = applyMask(e.target.value, mask);
    
    // Criar um evento sintético com o valor mascarado
    const syntheticEvent = {
      ...e,
      target: {
        ...e.target,
        value: maskedValue,
        name: e.target.name
      }
    };
    
    onChange(syntheticEvent);
  };
  
  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      {...props}
    />
  );
};

export default MaskedInput;
