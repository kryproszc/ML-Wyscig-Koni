################################################################################
######>>>>>>--------------------------------------------------------<<<<<<######
####>>>>
###>>>
###>>> EA Project New IM-QRTs
###>>> 
###>>> This skript reads test data from EA Annotated Templates .xslx-files 
###>>> and transforms it into the predefined inputdata-format for use in the 
###>>> IM-QRT-Tool. 
###>>>
###>>> 2025-05-27, Ein (WD)
###>>>
###>
###> Inputs: - skript 00_useful_functions.R (location: project root)
###>         - Test data .xlsx files (location: folder TestData)
###>         - 2025-04-22_z_axis_info_extended.xlsx (location: folder AuxFiles)
###>         - AD_HOC_CODE_mapping.xlsx (location: folder AuxFiles)
###>         - TAXO_PERIOD.xlsx (location: folder AuxFiles)
###>

###>>> clean up <<<----------------------------------------------------------###
###>
###>

################################################################################
######>>>>>>--------------------------------------------------------<<<<<<######
####>>>>
###>>>
###>>> EA Project New IM-QRTs
###>>> 
###>>> This skript defines some useful functions for data wrangling 
###>>>
###>>> 2023-10-27, Ein (WD)
###>>>
###>
###> Inputs: none
###>


# # function to get a named entry from tibble
# # (same row, value x cells right of name):
# getEntry <- function(tibble, EntryName, x) {
#   pos <- which(tibble == EntryName, arr.ind=TRUE) + c(0, x)
#   out <- tibble[pos[1], pos[2]]
#   return(out)
# }

# function to get the positions (row, col) of a pattern in a data frame
# if value = FALSE (default) returns a data frame of the positions
# if value = TRUE returns a vector of the values at the positions identified
getPos <- function(df, pattern, value = FALSE) {
  pos_mtx <- which(
    matrix(
      grepl(pattern, unlist(df)), 
      dim(df)), 
    arr.ind = TRUE)
  if (value == FALSE) {
    pos_mtx <- data.frame(pos_mtx)
    pos_mtx <- pos_mtx[order(pos_mtx[, 1]), ]
    return(pos_mtx)
  } else {
    df <- as.data.frame(df)
    values_at_pos <- df[pos_mtx]
    return(values_at_pos)
  }
}

# function to extract table from data frame based on output of getPos()
extract_df <- function(df, pos_mtx_rows, pos_mtx_cols) {
  row_start <- pos_mtx_cols[1, 1]
  col_start <- pos_mtx_cols[1, 2] - 1
  row_end <- pos_mtx_rows[nrow(pos_mtx_rows), 1]
  col_end <- pos_mtx_cols[nrow(pos_mtx_cols), 2]
  sub_df <- df[c(row_start : row_end), c(col_start : col_end)]
  return(sub_df)
}

# function to extract table from data frame based on output of getPos()
extract_df_2 <- function(df, pos_mtx_rows, pos_mtx_cols) {
  row_start <- pos_mtx_rows[1, 1]
  col_start <- pos_mtx_cols[1, 2]
  row_end <- pos_mtx_rows[nrow(pos_mtx_rows), 1]
  col_end <- pos_mtx_cols[nrow(pos_mtx_cols), 2]
  sub_df <- df[c(row_start : row_end), c(col_start : col_end)]
  return(sub_df)
}

# function to extract wide table
extract_wide <- function(df, row_nat_key, pos_mtx_cols) {
  row_start <- pos_mtx_cols[1, 1]
  col_start <- pos_mtx_cols[1, 2]
  row_end <- row_nat_key - 1
  col_end <- pos_mtx_cols[nrow(pos_mtx_cols), 2]
  sub_df <- df[c(row_start : row_end), c(col_start : col_end)]
  return(sub_df)
}

rm(list=ls(all=TRUE))
gc(reset=TRUE)

###>>> load useful functions
source("00_useful_functions.R")

###>>> load packages <<<-----------------------------------------------------###
library(readxl)
library(tidyverse)
library(tidyxl)

###>>> define paths <<<------------------------------------------------------###
paths_TestData <- c(
  paste("TestData", grep("~", list.files("TestData", 
                                         pattern = ".xlsx", 
                                         recursive = TRUE), 
                         invert = TRUE, value = TRUE), 
        sep = "/"))

# path to z_axis_info_extended.xlsx
path_z_axis_extended <- paste("AuxFiles", 
                              "2025-04-22_z_axis_info_extended.xlsx", sep = "/")

# path to AD_HOC_CODE_mapping.xlsx
path_ad_hoc_map <- paste("AuxFiles", 
                         "AD_HOC_CODE_mapping.xlsx", sep = "/")

# path to TAXO_PERIOD.xlsx
path_TAXO_PERIOD <- paste("AuxFiles", 
                          "TAXO_PERIOD.xlsx", sep = "/")

###>>> read in auxiliary files <<<-------------------------------------------###
# read in z_axis_info_extended.xlsx
z_axis_info_extended <- read_excel(path_z_axis_extended)

# read in AD_HOC_CODE_mapping.xlsx
ad_hoc_map <- read_excel(path_ad_hoc_map)

# read in TAXO_PERIOD.xlsx
TAXO_PERIOD <- read_excel(path_TAXO_PERIOD)

###>>> prepare empty output tibble <<<---------------------------------------###
# create an empty tibble with named cols for long data
names_cols <- c("TAXONOMY", "AD_HOC_CODE", "ENTRYPOINT", "LEI", "PERIOD", 
                "TABLE_CODE", "ROW_CODE", "COLUMN_CODE", "Z_DOMAIN_NUMBER_01", 
                "Z_NAME_01", "Z_DOMAIN_NUMBER_02", "Z_NAME_02", "CELL_VALUE")

vec <- setNames(rep("", length(names_cols)), names_cols)
inputdata <- as_tibble(t(vec))[0, ]   

# create an empty tibble with named cols for wide data
names_cols <- c("TAXONOMY", "AD_HOC_CODE", "ENTRYPOINT", "LEI", "PERIOD", 
                "TABLE_CODE", "C0020", "C0030", "C0040", "C0050", "C0060", 
                "C0160", "C0170", "C0180", "C0190", "C0200", "C0210", "C0220", 
                "C0070", "C0080", "C0090", "C0100", "C0110", "C0120", "C0130", 
                "C0140", "C0150")
vec <- setNames(rep("", length(names_cols)), names_cols)
inputdata_wide <- as_tibble(t(vec))[0, ] 

# clean up
rm( names_cols, vec)

###>>>
###>>>   START: automated read and transform the data to long format   <<<######
###>>>

for (k in c(1 : length(paths_TestData))) {
  # loop through UT-specific .xlsx files
  path_TestData <- paths_TestData[k]
  
  ###>
  ###> START: read in all sheets of k-th file and mark crossed cells --------###
  ###>
  
  # read sheet names
  sheets <- excel_sheets(path_TestData)
  IM_sheets <- sheets[grep(
    paste(c("^S.01.02.01", "^S.01.02.04", "^S.02.01.01", "^SE.02.01", 
            "^S.23.01", "^S.25.01", "^S.25.05", 
            paste0("^S.26.0", c(8:9)), 
            paste0("^S.26.", c(10:15))), collapse = "|"), sheets)]
  IM_sheets <- sort(IM_sheets)
  
  # check whether UT basic info i.e. template S.01.02.01 or S.01.02.04 is 
  # available and stop if not
  if (!any(c("S.01.02.01", "S.01.02.04") %in% IM_sheets)) {
    stop(paste0(
      "ERROR in file", path_TestData, 
      ": UT basic information (S.01.02.01 or S.01.02.04) is not in the data!"))
  }
  # check whether UT basic info for group AND solo is in the data and stop id so
  if (all(c("S.01.02.01", "S.01.02.04") %in% IM_sheets)) {
    stop(paste0(
      "ERROR in file", path_TestData, 
      ": S.01.02.01 and S.01.02.04 are both provided: ",
      "is this group or solo data?"))
  }
  
  # determine whether this is group or solo data
  if ("S.01.02.01" %in% IM_sheets) {
    if ("S.23.01.01" %in% IM_sheets) {
      ENTRYPOINT_string <- "ARS"
    } else {
      if ("S.23.01.02" %in% IM_sheets) {
        ENTRYPOINT_string <- "QRS"
      } else {
        stop(paste0(
          "ERROR in file", path_TestData, 
          ": S.01.02.01 is provided indicating solo data but S.23.01.01 and ",
          "S.23.01.02 are both missing such that not clear whether annual or ",
          "quarterly data is at hand!"))
      }
    }
  }
  if ("S.01.02.04" %in% IM_sheets) {
    if ("S.23.01.04" %in% IM_sheets) {
      ENTRYPOINT_string <- "ARG"
    } else {
      if ("S.23.01.05" %in% IM_sheets) {
        ENTRYPOINT_string <- "QRG"
      } else {
        stop(paste0(
          "ERROR in file", path_TestData, 
          ": S.01.02.04 is provided indicating group data but S.23.01.04 and ",
          "S.23.01.05 are both missing such that not clear whether annual or ",
          "quarterly data is at hand!"))
      }
    }
  }
  
  # read in all IM_sheets and mark crossed cells to exclude them later
  for (i in c(1:length(IM_sheets))) {
    df <- suppressMessages(
      read_excel(path_TestData, sheet = IM_sheets[i], col_names = FALSE))
    # identify and mark crossed cells
    cell_formats <- tidyxl::xlsx_cells(path_TestData, sheet = IM_sheets[i])
    # remove information on cells that are outside the read in df
    cell_formats <- cell_formats %>%
      filter(row <= nrow(df),
             col <= ncol(df))
    # extract information on crossed cells
    crossed_cells <- cell_formats %>% filter(style_format == "DPM_EmptyCell")
    if (nrow(crossed_cells) != 0) {
      for (j in c(1 : nrow(crossed_cells))) {
        df[crossed_cells$row[j], crossed_cells$col[j]] <- "crossed"
      }
    }
    assign(IM_sheets[i], df)
    print(paste0("Read in file ", k, " of ", length(paths_TestData), ": ", 
                 round(i/length(IM_sheets)*100, 2), "% done"))
  }

  # clean up
  rm(sheets, cell_formats, crossed_cells, df, i, j)
  
  ###>
  ###> END: read in all sheets of k-th file and mark crossed cells ----------###
  ###>
  
  
  ###> Extract LEI, PERIOD, NAME and AD_HOC_CODE from 
  ###> "S.01.02.01" or "S.01.02.04"
  # for solo data:
  if (grepl("S$", ENTRYPOINT_string)) {
    row_positions <- getPos(S.01.02.01, "^R\\d{4}")
    col_positions <- getPos(S.01.02.01, "^C\\d{4}")
    next_df <- extract_df(S.01.02.01, row_positions, col_positions)
    LEI_string <- next_df$...4[which(next_df$...3 == "R0020")]
    LEI_string <- gsub("\r?\n|\r", "", LEI_string)
    PERIOD_string <- next_df$...4[which(next_df$...3 == "R0090")]
    PERIOD_string <- as.character(as.Date(as.numeric(PERIOD_string), 
                                          origin = "1899-12-30"))
    NAME_string <- next_df$...4[which(next_df$...3 == "R0010")]
    NAME_string <- gsub("\r?\n|\r|\ ", "", NAME_string)
    AD_HOC_string <- next_df$...4[which(next_df$...3 == "R0100")]
  }
  
  # for group data:
  if (grepl("G$", ENTRYPOINT_string)) {
    row_positions <- getPos(S.01.02.04, "^R\\d{4}")
    col_positions <- getPos(S.01.02.04, "^C\\d{4}")
    next_df <- extract_df(S.01.02.04, row_positions, col_positions)
    LEI_string <- next_df$...4[which(next_df$...3 == "R0020")]
    LEI_string <- gsub("\r?\n|\r", "", LEI_string)
    PERIOD_string <- next_df$...4[which(next_df$...3 == "R0090")]
    PERIOD_string <- as.character(as.Date(as.numeric(PERIOD_string), 
                                          origin = "1899-12-30"))
    NAME_string <- next_df$...4[which(next_df$...3 == "R0010")]
    NAME_string <- gsub("\r?\n|\r|\ ", "", NAME_string)
    AD_HOC_string <- next_df$...4[which(next_df$...3 == "R0100")]
  }
  
  # prepare TAXONOMY_string
  TAXONOMY_string <- TAXO_PERIOD %>% 
    filter(PERIOD == PERIOD_string) %>% 
    pull(TAXONOMY)
  
  # prepare AD_HOC_string
  if (is.element(AD_HOC_string, ad_hoc_map$node_label)) {
    AD_HOC_string <- ad_hoc_map$Z_NAME[
      which(ad_hoc_map$node_label == AD_HOC_string)[1]]
  } else {
    AD_HOC_node <- as.numeric(gsub("([0-9]+).*$", "\\1", AD_HOC_string))
    AD_HOC_string <- ad_hoc_map$Z_NAME[
      which(ad_hoc_map$node_number == AD_HOC_node)[1]]
    rm(AD_HOC_node)
  }
  
  # prepare THIS_z_axis_info_extended:
  # NAs for the z-axes IL and RV are replaced by the information provided by 
  # this particular UT
  THIS_z_axis_info_extended <- z_axis_info_extended
  if ("S.26.13.01" %in% IM_sheets) {
    # read UT-specific values of IL defined in S.26.13.01.02 and store them in 
    # data frame IL_02_05_08
    df <- S.26.13.01
    start_row <- grep("S.26.13.01.02", df$...1)
    end_row <- grep("S.26.13.01.03", df$...1) - 1
    sub_df <- df[c(start_row:end_row), c(1:ncol(df))]
    IL_col <- getPos(sub_df, "^C0020") + c(1, 0)
    row_nat_key <- getPos(sub_df, "natural key")[1, 1]
    IL_02_05_08 <- extract_wide(sub_df, row_nat_key, IL_col)
    names(IL_02_05_08) <- "Z_NAME"
    # IL_02_05_08$node_label <- paste(c(1:nrow(IL_02_05_08)), 
    #                                 IL_02_05_08$Z_NAME, sep = "_")
    # IL_02_05_08$node_number <- as.numeric(gsub("([0-9]+).*$", "\\1", 
    #                                            IL_02_05_08$node_label))
    IL_02_05_08$node_label <- IL_02_05_08$Z_NAME
    IL_02_05_08$node_number <- c(1:nrow(IL_02_05_08))
    IL_02_05_08$TAXONOMY <- TAXONOMY_string
    
    # add other info from z_axis_info_extended alias THIS_z_axis_info_extended
    foo <- THIS_z_axis_info_extended %>%
      filter(TAXONOMY == TAXONOMY_string,
             TABLE_CODE %in% c("S.26.13.01.05", "S.26.13.01.08"),
             Z_DOMAIN_NUMBER == "IL") %>%
      select(-c("Z_NAME", "node_label", "node_number")) %>%
      full_join(IL_02_05_08, relationship = "many-to-many")
    
    # enrich THIS_z_axis_info_extended with information on the z-axis IL for 
    # tables S.26.13.01.05 and S.26.13.01.08
    THIS_z_axis_info_extended <- THIS_z_axis_info_extended %>%
      filter(TAXONOMY == TAXONOMY_string) %>%
      filter(!(TABLE_CODE %in% c("S.26.13.01.05", "S.26.13.01.08") &
                 is.na(Z_NAME))) %>%
      bind_rows(foo) %>%
      arrange(TABLE_CODE, Z_AXIS_NAME, Z_AXIS_COUNT, Z_DOMAIN_NUMBER, Z_NAME)
    # clean up
    rm(start_row, end_row, sub_df, IL_col, row_nat_key, IL_02_05_08, foo)
    
    # read UT-specific values of IL (2.8.0) or RV (2.8.2) defined in 
    # S.26.13.01.10 and store them in data frame IL_RV_11
    start_row <- grep("S.26.13.01.10", df$...1)
    end_row <- grep("S.26.13.01.11", df$...1) - 1
    sub_df <- df[c(start_row:end_row), c(1:ncol(df))]
    IL_col <- getPos(sub_df, "^C0020") + c(1, 0)
    row_nat_key <- getPos(sub_df, "natural key")[1, 1]
    IL_RV_11 <- extract_wide(sub_df, row_nat_key, IL_col)
    names(IL_RV_11) <- "Z_NAME"
    # IL_RV_11$node_label <- paste(c(1:nrow(IL_RV_11)), 
    #                              IL_RV_11$Z_NAME, sep = "_")
    # IL_RV_11$node_number <- as.numeric(gsub("([0-9]+).*$", "\\1", 
    #                                         IL_RV_11$node_label))
    IL_RV_11$node_label <- IL_RV_11$Z_NAME
    IL_RV_11$node_number <- c(1:nrow(IL_RV_11))
    IL_RV_11$TAXONOMY <- TAXONOMY_string
    
    # add other info from z_axis_info_extended alias THIS_z_axis_info_extended
    foo <- THIS_z_axis_info_extended %>%
      filter(TAXONOMY == TAXONOMY_string,
             TABLE_CODE %in% c("S.26.13.01.11"),
             Z_DOMAIN_NUMBER %in% c("IL", "RV")) %>%
      select(-c("Z_NAME", "node_label", "node_number")) %>%
      full_join(IL_RV_11, relationship = "many-to-many")
    
    # enrich THIS_z_axis_info_extended with information on the z-axis IL (2.8.0)
    # or RV (2.8.2) for table S.26.13.01.11
    THIS_z_axis_info_extended <- THIS_z_axis_info_extended %>%
      filter(TAXONOMY == TAXONOMY_string) %>%
      filter(!(TABLE_CODE %in% c("S.26.13.01.11") &
                 is.na(Z_NAME))) %>%
      bind_rows(foo) %>%
      arrange(TABLE_CODE, Z_AXIS_NAME, Z_AXIS_COUNT, Z_DOMAIN_NUMBER, Z_NAME)
    # clean up
    rm(start_row, end_row, sub_df, IL_col, row_nat_key, IL_RV_11, foo)
    rm(df)
  }

  # clean up
  rm(row_positions, col_positions, next_df)

  ###>
  ###> START: extract and transform sub-templates to long format ------------###
  ###> 

  for (i in c(1:length(IM_sheets))) {
    df <- get(IM_sheets[i])
    start_row <- grep("^S.0|^SE.0|^S.2", df$...1)[-1]
    end_row <- c(start_row[-1] - 1, nrow(df))

    for (j in c(1 : length(start_row))) {
      assign("sub_df",
             df[c(start_row[j]:end_row[j]), c(1:ncol(df))])
      THIS_TABLE <- as.character(sub_df[1, 1])

      # what z-axes and values are expected in sub_df?
      aux_z <- THIS_z_axis_info_extended %>% 
        filter(TABLE_CODE == THIS_TABLE,
               TAXONOMY == TAXONOMY_string) %>%
        arrange(Z_AXIS_COUNT, node_number)

      aux_z_reduced <- aux_z %>%
        distinct(TAXONOMY, TABLE_CODE, Z_AXIS_NAME, Z_AXIS_COUNT, 
                 Z_DOMAIN_NUMBER) %>%
        arrange(Z_AXIS_COUNT)
      
      # extract position(s) of string "^Z\\d{4}"
      z_location <- getPos(sub_df, "^Z\\d{4}")
      
      if (THIS_TABLE == "S.26.13.01.11") {
        if (nrow(z_location) == 0) {
          stop(paste0(
            "ERROR in ", THIS_TABLE, 
            ": Z-axes are expected but there are no z-axes in the data!"))
        } else {
          vec <- setNames(rep("", length(names(inputdata))), names(inputdata))
          next_df <- as_tibble(t(vec))[0, ]   
          # create aux vector of row-ids in S.26.13.01.11
          rows_S.26.13.01.11 <- c(z_location[, 1], nrow(sub_df)+1)

          for (ii in c(1:nrow(z_location))) {
            foo <- sub_df[c(rows_S.26.13.01.11[ii]:rows_S.26.13.01.11[ii+1]-1),
                          c(1:ncol(sub_df))]
            z_table <- sub_df[z_location[ii, 1], 
                              c((z_location[ii, 2] - 1) : ncol(sub_df))] %>% 
              select_if(function(x){!all(is.na(x))})
            if (ncol(z_table) < 4) {
              warning(paste0("No data in ", THIS_TABLE))
              next
            } else {
              # set colnames in z_table:
              colnames(z_table) <- c("Z_AXIS_NAME", "Z_AXIS_COUNT", 
                                     "Z_DOMAIN_NUMBER", "node_label")
              z_table <- z_table[,-1] %>%
                left_join(aux_z) %>%
                select(names(aux_z))
              z_table$VarNameCount <- 1
              # extract data and reshape
              row_positions <- getPos(foo, "^R\\d{4}")
              col_positions <- getPos(foo, "^C\\d{4}")
              # this is a closed table or a pseudo closed table
              bar <- extract_df(foo, row_positions, col_positions)
              names(bar) <- unlist(c("ROW_CODE", bar[1, 2:ncol(bar)]))
              bar <- bar[which(!is.na(bar[, 1])), ]
              bar <- bar %>%
                pivot_longer(
                  cols = names(bar)[2:ncol(bar)], 
                  names_to = "COLUMN_CODE",
                  values_to = "CELL_VALUE"
                )
              # create TAXONOMY, AD_HOC_CODE, ENTRYPOINT, TABLE_CODE, LEI, PERIOD
              AD_HOC_CODE <- rep(AD_HOC_string, nrow(bar))
              ENTRYPOINT <- rep(ENTRYPOINT_string, nrow(bar))
              TABLE_CODE <- rep(THIS_TABLE, nrow(bar))
              TABLE_CODE <- gsub("\r?\n|\r", "", TABLE_CODE)
              LEI <- rep(LEI_string, nrow(bar))
              PERIOD <- rep(PERIOD_string, nrow(bar))
              Z_DOMAIN_NUMBER_01 <- rep(z_table$Z_DOMAIN_NUMBER, nrow(bar))
              Z_NAME_01 <- rep(z_table$Z_NAME, nrow(bar))
              Z_DOMAIN_NUMBER_02 <- "not applicable"
              Z_NAME_02 <- "not applicable"
              bar <- cbind(bar, 
                           data.frame(AD_HOC_CODE, ENTRYPOINT, LEI, 
                                      PERIOD, TABLE_CODE, 
                                      Z_DOMAIN_NUMBER_01, Z_NAME_01, 
                                      Z_DOMAIN_NUMBER_02, Z_NAME_02))
              bar <- bar %>%
                left_join(TAXO_PERIOD)
              bar <- bar %>%
                select(TAXONOMY, AD_HOC_CODE, ENTRYPOINT, LEI, PERIOD, 
                       TABLE_CODE, ROW_CODE, COLUMN_CODE, Z_DOMAIN_NUMBER_01, 
                       Z_NAME_01, Z_DOMAIN_NUMBER_02, Z_NAME_02, CELL_VALUE)
              next_df <- next_df %>%
                bind_rows(bar)
              # clean up
              rm(foo, z_table, row_positions, col_positions, bar, 
                 AD_HOC_CODE, ENTRYPOINT, TABLE_CODE, LEI, PERIOD, 
                 Z_DOMAIN_NUMBER_01, Z_NAME_01, Z_DOMAIN_NUMBER_02,
                 Z_NAME_02)
            }
          }
          rm(vec, rows_S.26.13.01.11)
        }
        inputdata <- rbind(inputdata, next_df)
      } else {
        if (nrow(aux_z_reduced) != 0) {
          # at least 1 z axis is expected,  i.e. two possibilities:
          # 1. closed table with at least 1 z axis
          # 2. pseudo open table (i.e. containing z-axis IL or RV)
          # extract z axis info from the data:
          if (nrow(z_location) == 0) {
            stop(paste0(
              "ERROR in ", THIS_TABLE, 
              ": Relevant z-axes are expected but no z-axes in the data!"))
          } else {
            if (nrow(z_location) == 1 & !(THIS_TABLE == "S.26.13.01.11")) {
              z_table <- sub_df[as.numeric(z_location[1]), 
                                c(as.numeric(z_location[2]-1) : ncol(sub_df))] %>% 
                select_if(function(x){!all(is.na(x))})
              # the value of the z-axis is expected in column 4, if it is empty 
              # there are no data in the sub-template
              if (ncol(z_table) < 4) {
                warning(paste0("No data in ", THIS_TABLE))
                next
              } else {
                # set colnames in z_table:
                colnames(z_table) <- c("Z_AXIS_NAME", "Z_AXIS_COUNT", 
                                       "Z_DOMAIN_NUMBER", "node_label")
                # node label can vary but node number is expected to be the same
                # --> match z_table and aux_z by node number
                z_table$node_number <- 
                  as.numeric(gsub("([0-9]+).*$", "\\1", z_table$node_label))
                z_table$node_label <- NULL
                z_table <- z_table %>%
                  left_join(aux_z) %>%
                  select(names(aux_z))
                z_table$VarNameCount <- gsub("Z|0", "", z_table$Z_AXIS_COUNT)
              }
            } else {
              # here two tables with 2 rows each are expected
              # first: z_table is expected to have 3 cols
              z_table <- sub_df[c(as.numeric(z_location[1, 1]) : 
                                    as.numeric(z_location[2, 1])), 
                                c(as.numeric(z_location[1, 2] - 1) : 
                                    ncol(sub_df))] %>% 
                select_if(function(x){!all(is.na(x))})
              # set colnames in z_table:
              colnames(z_table) <- c("Z_AXIS_NAME", "Z_AXIS_COUNT", 
                                     "Z_DOMAIN_NUMBER")
              # second: z_details is expected to contain the values of the z-axes
              # there should be only 1 value for z-axis RT_*
              # the number of values for z-axis LB_* or IL varies
              z_details <- sub_df[c(as.numeric(z_location[3, 1]) : 
                                      as.numeric(z_location[4, 1])), 
                                  c(as.numeric(z_location[1, 2] - 1) : 
                                      ncol(sub_df))] %>% 
                select_if(function(x){!all(is.na(x))})
              z_details <- z_details %>% 
                pivot_longer(
                  cols = names(z_details)[2:ncol(z_details)], 
                  values_to = "node_label") %>%
                rename("Z_AXIS_COUNT" = "...2")  %>%
                select(Z_AXIS_COUNT, node_label) %>%
                distinct()
              # in UT-specific values of IL the node number can be missing and 
              # is therefore introduced artificially as in 
              # THIS_z_axis_info_extended for tables S.26.13.01.05 and 
              # S.26.13.01.08
              if (THIS_TABLE %in% c("S.26.13.01.05", "S.26.13.01.08")) {
                z_details <- z_details %>%
                  mutate(TABLE_CODE = THIS_TABLE) %>%
                  left_join(THIS_z_axis_info_extended) %>%
                  mutate(node_number = as.character(node_number)) %>%
                  mutate(node_number = if_else(!is.na(node_number), node_number, 
                                               gsub("([0-9]+).*$", "\\1", 
                                                    node_label))) %>%
                  mutate(node_number = as.numeric(node_number)) %>%
                  select(Z_AXIS_COUNT, node_label, node_number)
              } else {
                z_details$node_number <- 
                  as.numeric(gsub("([0-9]+).*$", "\\1", z_details$node_label))
              }
              # node label can vary but node number is expected to be the same
              # --> match z_table and aux_z by node number
              z_table <- z_table %>%
                full_join(z_details) %>%
                select(-node_label) %>%
                left_join(aux_z) %>%
                select(names(aux_z))
              z_table$VarNameCount <- gsub("Z|0", "", z_table$Z_AXIS_COUNT)
            }
          }
        }

        # extract data and reshape
        row_positions <- getPos(sub_df, "^R\\d{4}")
        col_positions <- getPos(sub_df, "^C\\d{4}")
        if (nrow(row_positions) == 0) {
          # this is a genuine open table
          row_nat_key <- getPos(sub_df, "natural key")[1, 1]                      
          next_df <- extract_wide(sub_df, row_nat_key, col_positions)
          next_df <- cbind(next_df[, 1], next_df)
          names(next_df) <- unlist(c("ROW_CODE", next_df[1, 2:ncol(next_df)]))
          next_df <- next_df[-1,]
          wide_df <- next_df[, -1]
          next_df <- next_df %>%
            pivot_longer(
              cols = names(next_df)[2:ncol(next_df)], 
              names_to = "COLUMN_CODE",
              values_to = "CELL_VALUE"
            )
          rm(row_nat_key)
        } else {
          # this is a closed table or a pseudo closed table
          next_df <- extract_df(sub_df, row_positions, col_positions)
          names(next_df) <- unlist(c("ROW_CODE", next_df[1, 2:ncol(next_df)]))
          next_df <- next_df[which(!is.na(next_df[, 1])), ]
          next_df <- next_df %>%
            pivot_longer(
              cols = names(next_df)[2:ncol(next_df)], 
              names_to = "COLUMN_CODE",
              values_to = "CELL_VALUE"
            )
        }
        
        # clean up
        rm(row_positions, col_positions)
        
        # include z-axes
        if (nrow(z_location) == 0) {
          Z_DOMAIN_NUMBER_01 <- rep("not applicable", nrow(next_df))
          Z_NAME_01 <- rep("not applicable", nrow(next_df))
          Z_DOMAIN_NUMBER_02 <- rep("not applicable", nrow(next_df))
          Z_NAME_02 <- rep("not applicable", nrow(next_df))
          next_df <- cbind(next_df, 
                           data.frame(Z_DOMAIN_NUMBER_01, Z_NAME_01, 
                                      Z_DOMAIN_NUMBER_02, Z_NAME_02))
          
        } else if (nrow(z_location) == 1 & 
                   all(z_table$Z_DOMAIN_NUMBER %in% 
                       THIS_z_axis_info_extended$Z_DOMAIN_NUMBER) &
                   (!(THIS_TABLE == "S.26.13.01.11"))) {
          if (z_table$Z_AXIS_COUNT == "Z0010") {
            next_df$Z_DOMAIN_NUMBER_01 <- z_table$Z_DOMAIN_NUMBER
            next_df$Z_NAME_01 <- z_table$Z_NAME
            next_df$Z_DOMAIN_NUMBER_02 <- "not applicable"
            next_df$Z_NAME_02 <- "not applicable"
          } else if ((z_table$Z_AXIS_COUNT == "Z0020")) {
            next_df$Z_DOMAIN_NUMBER_01 <- "not applicable"
            next_df$Z_NAME_01 <- "not applicable"
            next_df$Z_DOMAIN_NUMBER_02 <- z_table$Z_DOMAIN_NUMBER
            next_df$Z_NAME_02 <- z_table$Z_NAME
          } else {
            warning(paste0("Unexpected Z_AXIS_COUNT in ", 
                           THIS_TABLE, ": ",
                           z_table$Z_AXIS_COUNT))
          }
        } else if (nrow(z_location) == 4 & 
                   all(z_table$Z_DOMAIN_NUMBER %in% 
                       THIS_z_axis_info_extended$Z_DOMAIN_NUMBER) &
                   (!(THIS_TABLE == "S.26.13.01.11"))) {
          z_table_RT <- z_table[grep("RT_", z_table$Z_DOMAIN_NUMBER), ]
          z_table_LB <- z_table[-grep("RT_", z_table$Z_DOMAIN_NUMBER), ]
          if (z_table_RT$Z_AXIS_COUNT == "Z0010") {
            next_df$Z_DOMAIN_NUMBER_01 <- z_table_RT$Z_DOMAIN_NUMBER
            next_df$Z_NAME_01 <- z_table_RT$Z_NAME
            RT <- "1"
          } else if ((z_table_RT$Z_AXIS_COUNT == "Z0020")) {
            next_df$Z_DOMAIN_NUMBER_02 <- z_table_RT$Z_DOMAIN_NUMBER
            next_df$Z_NAME_02 <- z_table_RT$Z_NAME
            RT <- "2"
          } else {
            warning(paste0("Unexpected Z_AXIS_COUNT in ", 
                           THIS_TABLE, ": ",
                           z_table_RT$Z_AXIS_COUNT))
          }
          
          if (RT == "1") {
            next_df$Z_DOMAIN_NUMBER_02 <- z_table_LB$Z_DOMAIN_NUMBER[1]
            next_df$Z_NAME_02 <- rep(z_table_LB$Z_NAME, 
                                     nrow(next_df) / nrow(z_table_LB))
          } else if (RT == "2") {
            next_df$Z_DOMAIN_NUMBER_01 <- z_table_LB$Z_DOMAIN_NUMBER[1]
            next_df$Z_NAME_01 <- rep(z_table_LB$Z_NAME, 
                                     nrow(next_df) / nrow(z_table_LB))
          }
          next_df <- next_df %>%
            arrange(Z_NAME_02, ROW_CODE)
          
        } else if (nrow(z_location) > 4) {
          stop(paste0("There are more than 2 z-axes in ", 
                      THIS_TABLE, "!"))
        }
        
        if (exists("next_df")) {
          # remove hidden carriage returns from next_df
          next_df <- as.data.frame(
            lapply(next_df,
                   function(x) as.character(gsub("\r?\n|\r", "", x))))
          
          # finish and append to long data:
          # create TAXONOMY, AD_HOC_CODE, ENTRYPOINT, TABLE_CODE, LEI, PERIOD
          AD_HOC_CODE <- rep(AD_HOC_string, nrow(next_df))
          ENTRYPOINT <- rep(ENTRYPOINT_string, nrow(next_df))
          TABLE_CODE <- rep(THIS_TABLE, nrow(next_df))
          TABLE_CODE <- gsub("\r?\n|\r", "", TABLE_CODE)
          LEI <- rep(LEI_string, nrow(next_df))
          PERIOD <- rep(PERIOD_string, nrow(next_df))
          next_df <- cbind(next_df, 
                           data.frame(AD_HOC_CODE, ENTRYPOINT, LEI, 
                                      PERIOD, TABLE_CODE))
          next_df <- next_df %>%
            left_join(TAXO_PERIOD)
          next_df <- next_df %>%
            select(TAXONOMY, AD_HOC_CODE, ENTRYPOINT, LEI, PERIOD, TABLE_CODE, 
                   ROW_CODE, COLUMN_CODE, Z_DOMAIN_NUMBER_01, Z_NAME_01, 
                   Z_DOMAIN_NUMBER_02, Z_NAME_02, CELL_VALUE)
          
          inputdata <- rbind(inputdata, next_df)
        }
        
        # finish and append to wide data:
        # create TAXONOMY, AD_HOC_CODE, ENTRYPOINT, TABLE_CODE, LEI, PERIOD
        if (exists("wide_df") & 
            THIS_TABLE %in% c("S.26.13.01.02", "S.26.13.01.10", 
                              "S.26.15.01.02")) {
          # remove hidden carriage returns from wide_df
          wide_df <- as.data.frame(
            lapply(wide_df,
                   function(x) as.character(gsub("\r?\n|\r", "", x))))
          
          AD_HOC_CODE <- rep(AD_HOC_string, nrow(wide_df))
          ENTRYPOINT <- rep(ENTRYPOINT_string, nrow(wide_df))
          TABLE_CODE <- rep(THIS_TABLE, nrow(wide_df))
          TABLE_CODE <- gsub("\r?\n|\r", "", TABLE_CODE)
          LEI <- rep(LEI_string, nrow(wide_df))
          PERIOD <- rep(PERIOD_string, nrow(wide_df))
          wide_df <- cbind(wide_df, 
                           data.frame(AD_HOC_CODE, ENTRYPOINT, LEI, 
                                      PERIOD, TABLE_CODE))
          wide_df <- wide_df %>%
            left_join(TAXO_PERIOD)
          
          inputdata_wide <- inputdata_wide %>%
            bind_rows(wide_df)
        }
      }
    }
    
    # clean up
    rm(list = Filter(
      exists, c("df", "start_row", "end_row", "sub_df", "THIS_TABLE", 
                "z_location", "z_table", "z_domain", "sub_z_info", 
                "z_domain_01", "sub_z_info_01", "Z_DOMAIN_NUMBER_01", 
                "Z_NAME_01", "z_domain_02", "sub_z_info_02", 
                "Z_DOMAIN_NUMBER_02", "Z_NAME_02", "Z_DOMAIN_NUMBER", 
                "Z_NAME", "COLUMN_CODE", "ROW_CODE", "TABLE_CODE", 
                "ENTRYPOINT", "LEI", "PERIOD", "CELL_VALUE", "next_df",
                "wide_df")))
  }
  
  ###>
  ###> END: extract and transform sub-templates to long format --------------###
  ###> 
  
  # remove crossed cells from the data:
  inputdata <- inputdata %>%
    filter(!grepl("crossed", CELL_VALUE))
  
  inputdata$CELL_VALUE <- as.character(inputdata$CELL_VALUE)
  
  if (grepl("S$", ENTRYPOINT_string)) {
    to_adjust <- which(inputdata$TABLE_CODE == "S.01.02.01.01" & 
                         inputdata$COLUMN_CODE == "C0010" & 
                         inputdata$ROW_CODE %in% c("R0080", "R0081", "R0090"))
  }
  if (grepl("G$", ENTRYPOINT_string)) {
    to_adjust <- which(inputdata$TABLE_CODE == "S.01.02.04.01" & 
                         inputdata$COLUMN_CODE == "C0010" & 
                         inputdata$ROW_CODE %in% c("R0080", "R0081", "R0090"))
  }
  
  inputdata$CELL_VALUE[to_adjust] <- 
    as.character(as.Date(as.numeric(inputdata$CELL_VALUE[to_adjust]), 
                         origin = "1899-12-30"))
  
  # store the single UT data
  # 1. full long format data including CTs, pseudo OTs and genuine OTs
  df_name_long_full <- paste(NAME_string, ENTRYPOINT_string, 
                             gsub("-", "", PERIOD_string), "long_full", 
                             sep = "_")
  assign(df_name_long_full, inputdata)
  # 2. wide format data including only genuine OTs
  if (ENTRYPOINT_string %in% c("ARS", "ARG")) {
    df_name_wide <- paste(NAME_string, ENTRYPOINT_string, 
                          gsub("-", "", PERIOD_string), "wide", 
                          sep = "_")
    assign(df_name_wide, inputdata_wide)
  }
  # 3. long format data including only CTs and pseudo OTs
  df_name_long_partial <- paste(NAME_string, ENTRYPOINT_string, 
                                gsub("-", "", PERIOD_string), "long_partial", 
                                sep = "_")
  inputdata_long_partial <- inputdata %>%
    filter(!(TABLE_CODE %in% c("S.26.13.01.02", "S.26.13.01.10", 
                               "S.26.15.01.02")))
  assign(df_name_long_partial, inputdata_long_partial)
  
  
  # save the different inputdata as .csv and .RData
  # 1. full long format data including CTs, pseudo OTs and genuine OTs
  write.csv(inputdata,
            file = paste0("TransformedData/", df_name_long_full, ".csv"),
            row.names = FALSE)
  save(list = df_name_long_full, 
       file = paste0("TransformedData/", df_name_long_full, ".RData"))
  # 2. wide format data including only genuine OTs
  if (ENTRYPOINT_string %in% c("ARS", "ARG")) {
    write.csv(inputdata_wide,
              file = paste0("TransformedData/", df_name_wide, ".csv"),
              row.names = FALSE)
    save(list = df_name_wide, 
         file = paste0("TransformedData/", df_name_wide, ".RData"))
  }
  # 3. long format data including only CTs and pseudo OTs
  write.csv(inputdata_long_partial,
            file = paste0("TransformedData/", df_name_long_partial, ".csv"),
            row.names = FALSE)
  save(list = df_name_long_partial, 
       file = paste0("TransformedData/", df_name_long_partial, ".RData"))

  # prepare inputdata-data frame for next iteration:
  inputdata <- inputdata[0, ]
  inputdata_wide <- inputdata_wide[0, ]
  
  # clean up
  rm(list = IM_sheets)
  rm(IM_sheets, ENTRYPOINT_string, LEI_string, PERIOD_string, i, j)
}

# rbind all Test UT data and save
AllTestUTs_long_full <- bind_rows(mget(ls(pattern = "[0-9]{6}_long_full")))
AllTestUTs_long_partial <- bind_rows(mget(ls(pattern = "[0-9]{6}_long_partial")))
AllTestUTs_wide <- bind_rows(mget(ls(pattern = "[0-9]{6}_wide")))

# save the transformed data as .csv and as .RData
write.csv(AllTestUTs_long_full,
          file = paste0("TransformedData/AllTestUTs_long_full.csv"),
          row.names = FALSE)
save(AllTestUTs_long_full, 
     file = paste0("TransformedData/AllTestUTs_long_full.RData"))
write.csv(AllTestUTs_long_partial,
          file = paste0("TransformedData/AllTestUTs_long_partial.csv"),
          row.names = FALSE)
save(AllTestUTs_long_partial, 
     file = paste0("TransformedData/AllTestUTs_long_partial.RData"))
write.csv(AllTestUTs_wide,
          file = paste0("TransformedData/AllTestUTs_wide.csv"),
          row.names = FALSE)
save(AllTestUTs_wide, 
     file = paste0("TransformedData/AllTestUTs_wide.RData"))


