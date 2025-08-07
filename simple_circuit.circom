include "node_modules/circomlib/circuits/eddsamimc.circom";
include "node_modules/circomlib/circuits/comparators.circom";

// Simple transaction verification circuit
template SimpleTransactionVerifier() {
    // Public inputs
    signal input prevRoot;
    signal input newRoot;
    
    // Private inputs  
    signal input message;
    signal input Ax;
    signal input Ay;
    signal input R8x;
    signal input R8y;
    signal input S;
    
    // EdDSA signature verification
    component eddsa = EdDSAMiMCVerifier();
    eddsa.enabled <== 1;
    eddsa.Ax <== Ax;
    eddsa.Ay <== Ay;
    eddsa.R8x <== R8x;
    eddsa.R8y <== R8y;
    eddsa.S <== S;
    eddsa.M <== message;
    
    // Simple constraint: newRoot must be different from prevRoot
    component constraint = IsEqual();
    constraint.in[0] <== prevRoot;
    constraint.in[1] <== newRoot;
    constraint.out === 0;
}

component main = SimpleTransactionVerifier();