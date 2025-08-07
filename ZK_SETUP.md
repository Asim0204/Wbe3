# Zero-Knowledge Proof Setup for MiniChain

## Current Working Setup

✅ **Successfully Installed:**
- `snarkjs` (globally installed for proof generation)
- `circomlib@0.0.6` (compatible with circom 0.5.x)
- `circom@0.5.46` (working compiler)

✅ **Working Files:**
- `test_circuit.circom` - Basic transaction verification circuit (compiled successfully)
- `test_input.json` - Sample input data
- `witness.wtns` - Generated witness file

## Quick Start

### 1. Test Basic Circuit Compilation
```bash
# Compile the basic test circuit
circom test_circuit.circom --r1cs --wasm --sym

# Generate witness from test input
snarkjs wtns calculate test_circuit.wasm test_input.json witness.wtns
```

### 2. Setup Trusted Ceremony (One-time)
```bash
# Generate powers of tau (universal setup)
snarkjs powersoftau new bn128 12 pot12_0000.ptau

# Contribute to ceremony
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -e="random text"

# Prepare phase 2
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau

# Generate proving and verification keys
snarkjs groth16 setup test_circuit.r1cs pot12_final.ptau circuit_0000.zkey

# Contribute to phase 2
snarkjs zkey contribute circuit_0000.zkey circuit_0001.zkey --name="First contribution" -e="more random text"

# Export verification key
snarkjs zkey export verificationkey circuit_0001.zkey verification_key.json
```

### 3. Generate and Verify Proof
```bash
# Generate proof
snarkjs groth16 prove circuit_0001.zkey witness.wtns proof.json public.json

# Verify proof
snarkjs groth16 verify verification_key.json public.json proof.json
```

## Current Circuit Features

The `test_circuit.circom` demonstrates:
- **Input Validation**: Verifies signature and message are non-zero
- **State Transition**: Ensures blockchain state changes (prevRoot ≠ newRoot)
- **Basic Arithmetic**: Uses custom IsZero and IsEqual components

## Limitations & Next Steps

### Current Limitations
1. **No Real Cryptography**: Uses basic arithmetic instead of EdDSA signatures
2. **No Merkle Tree**: Missing proper state tree verification
3. **Simplified Logic**: Basic constraints for demonstration

### Recommended Upgrades
1. **Use Modern Circom 2.x**: Install newer version for better syntax
2. **Update circomlib**: Use latest version with proper EdDSA support
3. **Add Merkle Components**: Implement proper state tree verification
4. **Integrate with MiniChain**: Connect ZK proofs to main blockchain

## Integration with MiniChain Blockchain

### Client-Side Proof Generation
```javascript
// In your MiniChain frontend
async function generateTransactionProof(txData) {
    const input = {
        prevRoot: getCurrentStateRoot(),
        newRoot: calculateNewStateRoot(txData),
        signature: txData.signature,
        message: hashTransactionData(txData)
    };
    
    // Generate proof (would require snarkjs in browser)
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        "circuit.wasm",
        "circuit_final.zkey"
    );
    
    return { proof, publicSignals };
}
```

### Server-Side Verification
```javascript
// In your MiniChain backend
async function verifyTransactionProof(proof, publicSignals) {
    const vKey = JSON.parse(fs.readFileSync("verification_key.json"));
    
    const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);
    return res; // true if proof is valid
}
```

## File Structure
```
├── test_circuit.circom      # Working basic circuit
├── test_input.json         # Sample input data  
├── witness.wtns           # Generated witness
├── test_circuit.r1cs      # Compiled constraint system
├── test_circuit.wasm      # Circuit WebAssembly
├── verification_key.json  # Verification key (after setup)
├── circuit_0001.zkey     # Proving key (after setup)
└── ZK_SETUP.md           # This guide
```

## Commands Summary

```bash
# Compile circuit
circom test_circuit.circom --r1cs --wasm --sym

# Generate witness
snarkjs wtns calculate test_circuit.wasm test_input.json witness.wtns

# One-time setup (run once)
npm run setup

# Generate proof
snarkjs groth16 prove circuit_0001.zkey witness.wtns proof.json public.json

# Verify proof  
snarkjs groth16 verify verification_key.json public.json proof.json
```

This setup provides a foundation for adding zero-knowledge proofs to your MiniChain blockchain!