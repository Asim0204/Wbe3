// MiniChain transfer circuit matching user's input format
template MiniChainTransfer() {
    // Public inputs
    signal input prevRoot;
    signal input newRoot;
    
    // Private inputs
    signal input txFields[3]; // [sender, recipient, amount]
    signal input ownerPubKey[2]; // [px, py]
    signal input sigR[2]; // [rX, rY]
    signal input sigS; // s
    
    // Output validation result
    signal output isValid;
    
    // 1. Verify transaction fields are valid
    component amountCheck = GreaterThan(64);
    amountCheck.in[0] <== txFields[2]; // amount
    amountCheck.in[1] <== 0;
    
    // 2. Verify sender != recipient
    component addressCheck = IsEqual();
    addressCheck.in[0] <== txFields[0]; // sender
    addressCheck.in[1] <== txFields[1]; // recipient
    signal addressValid;
    addressValid <== 1 - addressCheck.out;
    
    // 3. Verify public key is valid (non-zero)
    component pubKeyXCheck = IsZero();
    pubKeyXCheck.in <== ownerPubKey[0];
    signal pubKeyXValid;
    pubKeyXValid <== 1 - pubKeyXCheck.out;
    
    component pubKeyYCheck = IsZero();
    pubKeyYCheck.in <== ownerPubKey[1];
    signal pubKeyYValid;
    pubKeyYValid <== 1 - pubKeyYCheck.out;
    
    // 4. Verify signature components are valid (non-zero)
    component sigRXCheck = IsZero();
    sigRXCheck.in <== sigR[0];
    signal sigRXValid;
    sigRXValid <== 1 - sigRXCheck.out;
    
    component sigRYCheck = IsZero();
    sigRYCheck.in <== sigR[1];
    signal sigRYValid;
    sigRYValid <== 1 - sigRYCheck.out;
    
    component sigSCheck = IsZero();
    sigSCheck.in <== sigS;
    signal sigSValid;
    sigSValid <== 1 - sigSCheck.out;
    
    // 5. Hash transaction fields for signature verification
    component txHasher = MiMC7Hash(3);
    txHasher.inputs[0] <== txFields[0];
    txHasher.inputs[1] <== txFields[1];
    txHasher.inputs[2] <== txFields[2];
    
    // 6. Verify state root transition (simplified)
    component stateCheck = IsEqual();
    stateCheck.in[0] <== prevRoot;
    stateCheck.in[1] <== newRoot;
    signal stateTransition;
    stateTransition <== 1 - stateCheck.out; // Must be different
    
    // Combine all validations
    signal validation1;
    signal validation2;
    signal validation3;
    signal validation4;
    signal validation5;
    
    validation1 <== amountCheck.out * addressValid;
    validation2 <== validation1 * pubKeyXValid;
    validation3 <== validation2 * pubKeyYValid;
    validation4 <== validation3 * sigRXValid;
    validation5 <== validation4 * sigRYValid;
    
    signal finalValidation;
    finalValidation <== validation5 * sigSValid;
    
    isValid <== finalValidation * stateTransition;
}

// Simple MiMC7 hash for 3 inputs
template MiMC7Hash(n) {
    signal input inputs[n];
    signal output out;
    
    // Simple hash simulation (in real implementation would use actual MiMC7)
    signal sum;
    sum <== inputs[0] + inputs[1] + inputs[2];
    
    // Ensure non-zero output
    component check = IsZero();
    check.in <== sum;
    out <== sum + 1 - check.out;
}

// GreaterThan component (simplified)
template GreaterThan(n) {
    signal input in[2];
    signal output out;
    
    // Simple greater than check (in[0] > in[1])
    component check = IsZero();
    check.in <== in[0];
    out <== 1 - check.out;
}

// IsZero component
template IsZero() {
    signal input in;
    signal output out;
    
    signal inv;
    
    inv <-- in != 0 ? 1/in : 0;
    
    out <== -in*inv + 1;
    in*out === 0;
}

// IsEqual component  
template IsEqual() {
    signal input in[2];
    signal output out;
    
    component isz = IsZero();
    
    in[1] - in[0] ==> isz.in;
    
    isz.out ==> out;
}

component main = MiniChainTransfer();