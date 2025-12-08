const { body, param, query, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: errors.array()[0].msg,
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

const courtValidators = {
  create: [
    body('name')
      .trim()
      .notEmpty().withMessage('Nome da quadra é obrigatório')
      .isLength({ min: 3, max: 100 }).withMessage('Nome deve ter entre 3 e 100 caracteres'),
    
    body('sportType')
      .trim()
      .notEmpty().withMessage('Tipo de esporte é obrigatório')
      .isIn(['FUTEBOL', 'BEACH_TENNIS', 'VOLEI', 'BASQUETE', 'OUTROS'])
      .withMessage('Tipo de esporte inválido'),
    
    body('capacity')
      .notEmpty().withMessage('Capacidade é obrigatória')
      .isInt({ min: 1, max: 100 }).withMessage('Capacidade deve ser entre 1 e 100'),
    
    body('pricePerHour')
      .notEmpty().withMessage('Preço por hora é obrigatório')
      .isFloat({ min: 0 }).withMessage('Preço deve ser um número positivo'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Descrição muito longa (máximo 500 caracteres)'),
    
    validate
  ],

  update: [
    param('id')
      .isUUID().withMessage('ID inválido'),
    
    body('name')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 }).withMessage('Nome deve ter entre 3 e 100 caracteres'),
    
    body('sportType')
      .optional()
      .isIn(['FUTEBOL', 'BEACH_TENNIS', 'VOLEI', 'BASQUETE', 'OUTROS'])
      .withMessage('Tipo de esporte inválido'),
    
    body('capacity')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Capacidade deve ser entre 1 e 100'),
    
    body('pricePerHour')
      .optional()
      .isFloat({ min: 0 }).withMessage('Preço deve ser um número positivo'),
    
    body('status')
      .optional()
      .isIn(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'])
      .withMessage('Status inválido'),
    
    validate
  ]
};

const clientValidators = {
  create: [
    body('fullName')
      .trim()
      .notEmpty().withMessage('Nome completo é obrigatório')
      .isLength({ min: 3, max: 100 }).withMessage('Nome deve ter entre 3 e 100 caracteres'),
    
    body('phone')
      .trim()
      .notEmpty().withMessage('Telefone é obrigatório')
      .matches(/^\(\d{2}\)\s?\d{4,5}-\d{4}$/).withMessage('Telefone inválido. Use (XX) XXXXX-XXXX'),
    
    body('email')
      .optional()
      .trim()
      .isEmail().withMessage('Email inválido')
      .normalizeEmail(),
    
    body('cpf')
      .optional()
      .trim()
      .matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/).withMessage('CPF inválido. Use XXX.XXX.XXX-XX'),
    
    validate
  ],

  update: [
    param('id')
      .isUUID().withMessage('ID inválido'),
    
    body('fullName')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 }).withMessage('Nome deve ter entre 3 e 100 caracteres'),
    
    body('phone')
      .optional()
      .trim()
      .matches(/^\(\d{2}\)\s?\d{4,5}-\d{4}$/).withMessage('Telefone inválido'),
    
    body('email')
      .optional()
      .trim()
      .isEmail().withMessage('Email inválido')
      .normalizeEmail(),
    
    body('cpf')
      .optional()
      .trim()
      .matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/).withMessage('CPF inválido'),
    
    validate
  ]
};

const reservationValidators = {
  create: [
    body('courtId')
      .notEmpty().withMessage('Quadra é obrigatória')
      .isUUID().withMessage('ID da quadra inválido'),
    
    body('clientId')
      .notEmpty().withMessage('Cliente é obrigatório')
      .isUUID().withMessage('ID do cliente inválido'),
    
    body('startTime')
      .notEmpty().withMessage('Horário de início é obrigatório')
      .isISO8601().withMessage('Data/hora inválida'),
    
    body('durationInHours')
      .notEmpty().withMessage('Duração é obrigatória')
      .isInt({ min: 1, max: 12 }).withMessage('Duração deve ser entre 1 e 12 horas'),
    
    body('isRecurring')
      .optional()
      .isBoolean().withMessage('isRecurring deve ser true ou false'),
    
    body('frequency')
      .if(body('isRecurring').equals('true'))
      .notEmpty().withMessage('Frequência é obrigatória para reservas recorrentes')
      .isIn(['WEEKLY', 'MONTHLY']).withMessage('Frequência inválida'),
    
    body('endDate')
      .if(body('isRecurring').equals('true'))
      .notEmpty().withMessage('Data final é obrigatória para reservas recorrentes')
      .isISO8601().withMessage('Data inválida'),
    
    validate
  ],

  query: [
    query('startDate')
      .optional()
      .isISO8601().withMessage('Data de início inválida'),
    
    query('endDate')
      .optional()
      .isISO8601().withMessage('Data final inválida'),
    
    query('courtId')
      .optional()
      .isUUID().withMessage('ID da quadra inválido'),
    
    query('status')
      .optional()
      .isIn(['CONFIRMED', 'PENDING', 'CANCELLED']).withMessage('Status inválido'),
    
    validate
  ]
};

const productValidators = {
  create: [
    body('name')
      .trim()
      .notEmpty().withMessage('Nome do produto é obrigatório')
      .isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres'),
    
    body('price')
      .notEmpty().withMessage('Preço é obrigatório')
      .isFloat({ min: 0 }).withMessage('Preço deve ser um número positivo'),
    
    body('stock')
      .notEmpty().withMessage('Estoque é obrigatório')
      .isInt({ min: 0 }).withMessage('Estoque deve ser um número inteiro positivo'),
    
    body('unit')
      .notEmpty().withMessage('Unidade é obrigatória')
      .isIn(['UNIDADE', 'LITRO', 'KG', 'CAIXA', 'PACOTE'])
      .withMessage('Unidade inválida'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Descrição muito longa'),
    
    body('expiryDate')
      .optional()
      .isISO8601().withMessage('Data de validade inválida'),
    
    validate
  ],

  stockMovement: [
    body('quantity')
      .notEmpty().withMessage('Quantidade é obrigatória')
      .isInt({ min: 1 }).withMessage('Quantidade deve ser um número positivo'),
    
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 200 }).withMessage('Motivo muito longo'),
    
    validate
  ]
};

const tabValidators = {
  create: [
    body('clientId')
      .notEmpty().withMessage('Cliente é obrigatório')
      .isUUID().withMessage('ID do cliente inválido'),
    
    body('reservationId')
      .optional()
      .isUUID().withMessage('ID da reserva inválido'),
    
    validate
  ],

  addItem: [
    body('productId')
      .optional()
      .isUUID().withMessage('ID do produto inválido'),
    
    body('description')
      .trim()
      .notEmpty().withMessage('Descrição é obrigatória')
      .isLength({ min: 2, max: 200 }).withMessage('Descrição deve ter entre 2 e 200 caracteres'),
    
    body('quantity')
      .notEmpty().withMessage('Quantidade é obrigatória')
      .isInt({ min: 1 }).withMessage('Quantidade deve ser um número positivo'),
    
    body('unitPrice')
      .notEmpty().withMessage('Preço unitário é obrigatório')
      .isFloat({ min: 0 }).withMessage('Preço deve ser um número positivo'),
    
    validate
  ]
};

const validateId = [
  param('id').isUUID().withMessage('ID inválido'),
  validate
];

module.exports = {
  validate,
  validateId,
  courtValidators,
  clientValidators,
  reservationValidators,
  productValidators,
  tabValidators
};