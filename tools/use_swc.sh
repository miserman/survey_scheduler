#!/bin/bash
file="$(dirname ".")/.babelrc"
if [[ -f "$file" ]]
then
  mv "$file" "$(dirname ".")/_babelrc"
fi