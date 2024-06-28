#!/bin/bash
file="$(dirname ".")/_babelrc"
if [[ -f "$file" ]]
then
  mv "$file" "$(dirname ".")/.babelrc"
fi