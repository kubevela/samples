#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

# -e: immediately exit if any command has a non-zero exit status
# -o: prevents errors in a pipeline from being masked
# IFS new value is less likely to cause confusing bugs when looping arrays or arguments (e.g. $@)

usage() { echo "Usage: $0 -a <applicationGatewayName> -g <resourceGroupName> -n <backendPoolName> -s <subnetPool>" 1>&2; exit 1; }

declare agName=""
declare rgName=""
declare backendPoolName=""
declare subnetPool=""

# Initialize parameters specified from command line
while getopts ":a:g:n:s:" arg; do
	case "${arg}" in
		a)
			agName=${OPTARG}
			;;
		g)
			rgName=${OPTARG}
			;;
		n)
			backendPoolName=${OPTARG}
			;;
		s)
			subnetPool=${OPTARG}
			;;
		esac
done
shift $((OPTIND-1))

#Prompt for parameters is some required parameters are missing
if [[ -z "$agName" ]]; then
	echo "Enter your application gateway name: "
	read agName
	[[ "${agName:?}" ]]
fi

if [[ -z "$rgName" ]]; then
	echo "Enter a resource group name: "
	read rgName
	[[ "${rgName:?}" ]]
fi

if [[ -z "$backendPoolName" ]]; then
	echo "The name of your backend pool can be identified by running az network application-gateway address-pool list --gateway-name <applicationGatewayName> --resource-group <resourceGroupName>"
	echo "Enter a name for the backend pool: "
	read backendPoolName
fi

if [[ -z "$subnetPool" ]]; then
	echo "You need to enter the subnet in CIDR notation for the subnet pool containing your Hydra deployment"	
	echo "Enter a subnet CIDR: "
	read subnetPool
fi

if [[ -z "$agName" ]] || [[ -z "$rgName" ]] || [[ -z "$backendPoolName" ]] || [[ -z "$subnetPool" ]]; then
	echo "Either one of backendPoolName or subnet CIDR is empty"
	usage
fi

IFS='.'
read -ra ADDR <<< "$subnetPool" 
firstNum="${ADDR[0]}"
secondNum="${ADDR[1]}"
thirdNum="${ADDR[2]}"

lastDigitCIDR="${ADDR[3]}"

IFS='/'
read -ra ADDR <<< "$lastDigitCIDR"

mask="${ADDR[1]}"
exponent=$(expr 32 - $mask)

cmd="az network application-gateway address-pool create -g $rgName --gateway-name $agName -n $backendPoolName --servers"

if [ $exponent -gt 8 ]
then
	firstDigits=$(expr 16 - $exponent) #5
	secondDigits=$(expr $exponent - 8)
	sum=0

	for ((d=1; d<=$firstDigits; d++))
	do
		temp=$(expr 8 - $d)
		powerCalc=$((2 ** temp))

		sum=$(expr $sum + $powerCalc)
	done 

	thirdNum=$(($thirdNum|$sum))

	maxLimit=$((2 ** $secondDigits))
	maxLimit=$(expr $maxLimit + $thirdNum)
	for ((e=thirdNum; e<$maxLimit; e++))
	do 
		for ((f=0; f<=255; f++))
		do 
			cmd="$cmd $firstNum.$secondNum.$e.$f"
		done 		
	done
else
	count=$((2 ** $exponent))
	count=$(expr $count - 1)

	for ((c=0; c<=$count; c++))
	do 
		cmd="$cmd $firstNum.$secondNum.$thirdNum.$c"
	done 
fi

# echo $cmd 

echo "Starting update of backend pool ..."
(
	eval "$cmd"
)

