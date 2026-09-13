import { createTheme } from "@mui/material"
import { cyan } from "@mui/material/colors"

// declare module "@mui/material/styles" {
//   interface BreakpointOverrides {
//     xxs: true // adds the `xxs` breakpoint
//     xs: true
//     sm: true
//     md: true
//     lg: true
//     xl: true
//   }
// }

const Theme = createTheme({
  // breakpoints: {
  //   values: {
  //     xxs: 0,
  //     xs: 320,
  //     sm: 600,
  //     md: 900,
  //     lg: 1200,
  //     xl: 1536,
  //   },
  // },
  palette: {
    mode: "light",
    primary: {
      main: "#e84122",
    },
    secondary: {
      main: "#e6e5e5",
    },
  },
  // https://mui.com/material-ui/customization/theme-components/
  components: {
    // MuiButtonBase: {
    //   defaultProps: {
    //     // The props to change the default for.
    //     disableRipple: true, // No more ripple, on the whole application 💣!
    //   },
    // },
    MuiButton: {
      styleOverrides: {
        // Name of the slot
        root: {
          "&.MuiButton-containedPrimary": {
            // backgroundColor: "#e84122",
            backgroundImage: 'url("/assets/button.jpg")',
            backgroundRepeat: "no-repeat",
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          "& legend span": {
            display: "none",
          },
          "&.MuiInputBase-formControl": {
            backgroundColor: "#fff",
          },
          // "& .MuiOutlinedInput-notchedOutline": {
          //   top: 0,
          // },
          "&.Mui-focused": {
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: cyan[500],
              // borderWidth: "1px",
            },
          },
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          "&": {
            display: "none",
          },
          "&.Mui-focused": {
            "&.MuiInputLabel-root": {
              color: cyan[500],
            },
          },
        },
      },
    },
    // Moved out of src/styles/index.css, where a comment had been asking for exactly this since
    // the beginning (issue #1). The `!important` flags come along unchanged: as plain CSS these
    // rules sat in `@layer components` and beat MUI by layer order, but here they are IN the mui
    // layer, competing with MUI's own `grouped` styles on specificity — and MUI's are the more
    // specific (`&:not(:first-of-type)` and friends). Dropping the flags is a separate cleanup
    // with its own before/after snapshot run.
    // `:first-child`/`:last-child`, not `:first-of-type`: that is what the CSS said, and the
    // groups only ever contain ToggleButtons, so the two agree today.
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          borderLeft: "1px solid #e0e0e0",
          paddingTop: "1px",
          overflow: "hidden",
        },
        grouped: {
          marginTop: "-1px !important",
          minWidth: "86px",
          minHeight: "76px",
          borderColor: "#e0e0e0 !important",
          textTransform: "lowercase !important",
          fontSize: "14px !important",
          lineHeight: "2 !important",
          "&:first-child": {
            borderBottomLeftRadius: 0,
            borderTopLeftRadius: 0,
            marginLeft: "-1px",
          },
          "&:last-child": {
            borderTopRightRadius: 0,
          },
        },
      },
    },
  },
})

export default Theme
