setwd("ścieżka/do/TransformedData")  # jeśli trzeba

long_full   <- read.csv("AllTestUTs_long_full.csv", stringsAsFactors = FALSE)
long_part   <- read.csv("AllTestUTs_long_partial.csv", stringsAsFactors = FALSE)
wide        <- read.csv("AllTestUTs_wide.csv", stringsAsFactors = FALSE)
dim(long_full)
names(long_full)

dim(long_part)
names(long_part)

dim(wide)
names(wide)
unique(long_full$TABLE_CODE)
unique(long_part$TABLE_CODE)
unique(wide$TABLE_CODE)
