# MiniChain Zero-Knowledge Proof Circuit

This project implements a Circom circuit for zero-knowledge proof verification of blockchain transactions using EdDSA signatures and Merkle tree proofs.

## Circuit Overview

The `TransactionVerifier` circuit proves that:
1. **Valid Signature**: The transaction is signed by the correct private key using EdDSA
2. **Merkle Inclusion**: The transaction is properly included in a Merkle tree state update
3. **State Transition**: The blockchain state root transitions correctly from `prevRoot` to `newRoot`

## Circuit Components

### Main Circuit: `TransactionVerifier(depth, txFieldCount)`
- **Public Inputs**: `prevRoot`, `newRoot`
- **Private Inputs**: Transaction fields, signature data, Merkle path proof
- **Outputs**: Zero-knowledge proof that the transaction is valid

### EdDSA Signature Verification
- Uses EdDSA (Edwards-curve Digital Signature Algorithm)
- Verifies transaction was signed by the owner's private key
- Transaction fields are hashed using MiMC7 before signature verification

### Merkle Tree State Update
- Proves inclusion of the transaction in the blockchain state
- Updates Merkle tree root from `prevRoot` to `newRoot`
- Supports configurable tree depth (default: 20 levels)

## Installation

```bash
# Install dependencies
npm install

# Install Circom compiler (if not already installed)
npm install -g circom

# Install snarkjs for proof generation
npm install -g snarkjs
```

## Usage

### 1. Compile the Circuit
```bash
npm run compile
```

### 2. Generate Witness Data
```bash
node witness_generator.js
```

### 3. Trusted Setup (one-time)
```bash
npm run setup
```

### 4. Generate Proof
```bash
# First generate witness from input
snarkjs wtns calculate circuit.wasm input.json witness.wtns

# Generate the proof
npm run prove
```

### 5. Verify Proof
```bash
npm run verify
```

## Circuit Parameters

- **Tree Depth**: 20 levels (supports up to 2^20 leaves)
- **Transaction Fields**: 6 fields (from, to, amount, nonce, timestamp, fee)
- **Hash Function**: MiMC7 (ZK-friendly hash)
- **Signature Scheme**: EdDSA on Baby Jubjub curve

## File Structure

```
├── circuit.circom           # Main Circom circuit
├── package.json            # NPM dependencies and scripts
├── witness_generator.js    # Helper to generate test inputs
├── README.md              # This file
└── input.json             # Generated witness input (after running generator)
```

## Integration with MiniChain

This circuit can be integrated with the MiniChain blockchain to provide:

1. **Private Transactions**: Hide transaction details while proving validity
2. **Scalability**: Batch multiple transactions into a single proof
3. **Privacy**: Prove transaction validity without revealing amounts or addresses
4. **Compliance**: Prove adherence to rules without revealing sensitive data

## Security Considerations

- Uses cryptographically secure hash functions (MiMC7)
- EdDSA signatures provide non-repudiation
- Merkle proofs ensure state consistency
- Zero-knowledge proofs hide sensitive transaction data

## Development

To modify the circuit:

1. Edit `circuit.circom`
2. Recompile with `npm run compile`
3. Update `witness_generator.js` if input format changes
4. Re-run trusted setup if circuit structure changes significantly

## License

MIT License