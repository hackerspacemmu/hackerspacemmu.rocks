/**
 * Email Validation
 */ 

//standard pattern for email
const targetPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
//targeted mmu domain
const targetDomain = /mmu.edu.my/

const formBtn =
    document.getElementById('formButton')
        .addEventListener('click', emailValidation, false);

function emailValidation(event) {
    var emailInputElement = document.getElementById("validationMMUEmail")
    var domainString = emailInputElement.value.slice(emailInputElement.value.lastIndexOf('@') + 1)
    var domainLen = domainString.length
    var idx = domainString.search(targetDomain)
    
    console.log(emailInputElement.value)
    console.log(targetPattern)
    console.log(idx, domainLen)

    // Check if the input is empty
    if (emailInputElement.value == "") {
        emailInputElement.classList.remove("is-valid")
        emailInputElement.classList.remove("is-invalid")
        event.preventDefault()
        event.stopPropagation()
    }

    // Check if the input match email pattern && match domain pattern (explained below)
    if (emailInputElement.value.match(targetPattern) && idx > -1 && (idx + 10 == domainLen)){   
        console.log("is-invalid")
        emailInputElement.classList.remove("is-invalid")
        emailInputElement.classList.add("is-valid")
    }
    else {
        console.log("is-invalid")
        emailInputElement.classList.remove("is-valid")
        emailInputElement.classList.add("is-invalid")
        event.preventDefault()
        event.stopPropagation()
    }
}

/**
 * Domain Pattern Explanation
 * what does "(idx + 10 == domainLen)" means?
 *  
 * idx is the index of mmu.edu.my after @
 *    example 1: hello@student.mmu.edu.my
 *       idx will be counted starting from "s" as 0, 
 *       when it encouters mmu.edu.my, the idx is 8
 * 
 * domainLen is the length of the domain after @
 *    example 1: hello@yahoo.com
 *       domainLen will be 9
 *    example 2: hello@student.mmu.edu.my
 *       domainLen will be 18
 * 
 * To check whether the mmu.edu.my is at the very "last"
 * idx + 10 equals to domainLen
 */ 
